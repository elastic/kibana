/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { getSavedQuerySecurityUtils } from '../utils/saved_query_security';

export type FeatureName =
  | 'discover'
  | 'discover_v2'
  | 'dashboard'
  | 'dashboard_v2'
  | 'maps'
  | 'maps_v2'
  | 'visualize'
  | 'visualize_v2';
export type FeatureApp = 'discover' | 'dashboard' | 'maps' | 'visualize';

export function createSecurityTests(
  featureConfigs: Array<{
    feature: FeatureName;
    app: FeatureApp;
    hasImplicitSaveQueryManagement: boolean;
  }>
) {
  return function (ctx: FtrProviderContext) {
    const { getPageObjects, getService } = ctx;
    const savedQuerySecurityUtils = getSavedQuerySecurityUtils(ctx);
    const esArchiver = getService('esArchiver');
    const securityService = getService('security');
    const globalNav = getService('globalNav');
    const kibanaServer = getService('kibanaServer');
    const testSubjects = getService('testSubjects');
    const { common, discover, security, dashboard, maps, visualize, spaceSelector } =
      getPageObjects([
        'common',
        'discover',
        'security',
        'dashboard',
        'maps',
        'visualize',
        'spaceSelector',
      ]);

    async function login(
      featureName: FeatureName,
      featurePrivilege: 'read' | 'all',
      globalPrivilege: 'none' | 'read' | 'all',
      expectSpaceSelector = false
    ) {
      const name = `global_saved_query_${featureName}`;
      const password = `password_${name}_${featurePrivilege}_${globalPrivilege}`;

      await securityService.role.create(name, {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              [featureName]: [featurePrivilege],
              savedQueryManagement: [globalPrivilege],
            },
            spaces: ['*'],
          },
        ],
      });

      await securityService.user.create(`${name}-user`, {
        password,
        roles: [name],
        full_name: 'test user',
      });

      await security.login(`${name}-user`, password, { expectSpaceSelector });
    }

    async function logout(featureName: FeatureName) {
      const name = `global_saved_query_${featureName}`;
      await security.forceLogout();
      await securityService.role.delete(name);
      await securityService.user.delete(`${name}-user`);
    }

    async function navigateToApp(appName: FeatureApp) {
      switch (appName) {
        case 'discover':
          await common.navigateToApp('discover');
          await discover.selectIndexPattern('logstash-*');
          break;
        case 'dashboard':
          await dashboard.navigateToApp();
          await dashboard.loadSavedDashboard('A Dashboard');
          break;
        case 'maps':
          await maps.openNewMap();
          break;
        case 'visualize':
          await visualize.navigateToNewVisualization();
          await visualize.clickVisType('lens');
          break;
        default:
          break;
      }
    }

    async function assertReadOnlyBadgeExists(appName: FeatureApp) {
      switch (appName) {
        case 'discover':
          await testSubjects.existOrFail('discover-readonly-badge');
          break;
        default:
          await globalNav.badgeExistsOrFail('Read only');
      }
    }

    async function assertReadOnlyBadgeMissing(appName: FeatureApp) {
      switch (appName) {
        case 'discover':
          await testSubjects.missingOrFail('discover-readonly-badge');
          break;
        default:
          await globalNav.badgeMissingOrFail();
      }
    }

    describe('Security', () => {
      describe('App vs Global privilege', () => {
        featureConfigs.forEach(({ feature, app, hasImplicitSaveQueryManagement }) => {
          before(async () => {
            await kibanaServer.savedObjects.cleanStandardList();

            await kibanaServer.importExport.load(
              'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard/feature_controls/security/security.json'
            );

            await esArchiver.loadIfNeeded(
              'x-pack/platform/test/fixtures/es_archives/logstash_functional'
            );

            // ensure we're logged out, so we can log in as the appropriate users
            await security.forceLogout();
          });

          after(async () => {
            // logout, so the other tests don't accidentally run as the custom users we're testing below
            // NOTE: Logout needs to happen before anything else to avoid flaky behavior
            await security.forceLogout();

            await kibanaServer.importExport.unload(
              'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard/feature_controls/security/security.json'
            );

            await kibanaServer.savedObjects.cleanStandardList();
          });

          describe(`${feature} read-only privileges with savedQueryManagement.saveQuery all privilege`, () => {
            before(async () => {
              await login(feature, 'read', 'all');
              await navigateToApp(app);
              await common.waitForTopNavToBeVisible();
            });

            after(async () => {
              await logout(feature);
            });

            it('shows read-only badge', async () => {
              await assertReadOnlyBadgeExists(app);
            });

            savedQuerySecurityUtils.shouldAllowSavingQueries();
          });

          describe(`${feature} read-only privileges with savedQueryManagement.saveQuery read privilege`, () => {
            before(async () => {
              await login(feature, 'read', 'read');
              await navigateToApp(app);
              await common.waitForTopNavToBeVisible();
            });

            after(async () => {
              await logout(feature);
            });

            it('shows read-only badge', async () => {
              await assertReadOnlyBadgeExists(app);
            });

            savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
          });

          describe(`${feature} read-only privileges with disabled savedQueryManagement.saveQuery privilege`, () => {
            before(async () => {
              await login(feature, 'read', 'none');
              await navigateToApp(app);
            });

            after(async () => {
              await logout(feature);
            });

            it('shows read-only badge', async () => {
              await assertReadOnlyBadgeExists(app);
            });

            if (hasImplicitSaveQueryManagement) {
              savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
            } else {
              savedQuerySecurityUtils.shouldDisallowAccessToSavedQueries();
            }
          });

          describe(`${feature} all privileges with savedQueryManagement.saveQuery all privilege`, () => {
            before(async () => {
              await login(feature, 'all', 'all');
              await navigateToApp(app);
            });

            after(async () => {
              await logout(feature);
            });

            it("doesn't show read-only badge", async () => {
              await assertReadOnlyBadgeMissing(app);
            });

            savedQuerySecurityUtils.shouldAllowSavingQueries();
          });

          describe(`${feature} all privileges with savedQueryManagement.saveQuery read privilege`, () => {
            before(async () => {
              await login(feature, 'all', 'read');
              await navigateToApp(app);
            });

            after(async () => {
              await logout(feature);
            });

            it("doesn't show read-only badge", async () => {
              await assertReadOnlyBadgeMissing(app);
            });

            if (hasImplicitSaveQueryManagement) {
              savedQuerySecurityUtils.shouldAllowSavingQueries();
            } else {
              savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
            }
          });

          describe(`${feature} all privileges with disabled savedQueryManagement.saveQuery privilege`, () => {
            before(async () => {
              await login(feature, 'all', 'none');
              await navigateToApp(app);
            });

            after(async () => {
              await logout(feature);
            });

            it("doesn't show read-only badge", async () => {
              await assertReadOnlyBadgeMissing(app);
            });

            if (hasImplicitSaveQueryManagement) {
              savedQuerySecurityUtils.shouldAllowSavingQueries();
            } else {
              savedQuerySecurityUtils.shouldDisallowAccessToSavedQueries();
            }
          });
        });
      });

      describe('Spaces feature visibility', () => {
        featureConfigs.forEach(({ feature }) => {
          describe(`space with ${feature} disabled`, () => {
            const spaceId = `${feature}_space`;
            let disabledFeatureId: string;

            before(async () => {
              await kibanaServer.spaces.create({
                id: spaceId,
                name: spaceId,
                disabledFeatures: [feature],
              });
              const disabledFeature = (await kibanaServer.spaces.get(spaceId)) as {
                disabledFeatures: string[];
              };
              [disabledFeatureId] = disabledFeature.disabledFeatures;
              await common.navigateToApp('home');
            });

            after(async () => {
              await kibanaServer.spaces.delete(spaceId);
            });

            it('should not disable saved query management feature visibility', async () => {
              await spaceSelector.openSpacesNav();
              await spaceSelector.clickManageSpaces();
              await spaceSelector.clickSpaceEditButton(spaceId);
              await spaceSelector.toggleFeatureCategoryVisibility('kibana');
              await spaceSelector.toggleFeatureCategoryVisibility('management');
              expect(await spaceSelector.getFeatureCheckboxState(disabledFeatureId)).to.be(false);
              expect(await spaceSelector.getFeatureCheckboxState('savedQueryManagement')).to.be(
                true
              );
            });
          });
        });
      });
    });
  };
}
