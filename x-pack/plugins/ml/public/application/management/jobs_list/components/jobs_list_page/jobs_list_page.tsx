/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesContextProps, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { EnabledFeaturesContextProvider } from '../../../../contexts/ml';
import { type MlFeatures, PLUGIN_ID } from '../../../../../../common/constants/app';

import { checkGetManagementMlJobsResolver } from '../../../../capabilities/check_capabilities';

import { AccessDeniedPage } from '../access_denied_page';
import { InsufficientLicensePage } from '../insufficient_license_page';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync';
import { getMlGlobalServices } from '../../../../app';
import { ExportJobsFlyout, ImportJobsFlyout } from '../../../../components/import_export_jobs';
import type { MlSavedObjectType } from '../../../../../../common/types/saved_objects';

import { SpaceManagement } from './space_management';
import { DocsLink } from './docs_link';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

interface Props {
  coreStart: CoreStart;
  share: SharePluginStart;
  history: ManagementAppMountParams['history'];
  spacesApi?: SpacesPluginStart;
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsStart;
  isServerless: boolean;
  mlFeatures: MlFeatures;
}

export const JobsListPage: FC<Props> = ({
  coreStart,
  share,
  history,
  spacesApi,
  data,
  usageCollection,
  fieldFormats,
  isServerless,
  mlFeatures,
}) => {
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPlatinumOrTrialLicense, setIsPlatinumOrTrialLicense] = useState(true);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<MlSavedObjectType>('anomaly-detector');
  const I18nContext = coreStart.i18n.Context;
  const theme$ = coreStart.theme.theme$;

  const mlServices = useMemo(
    () => getMlGlobalServices(coreStart.http, usageCollection),
    [coreStart.http, usageCollection]
  );

  const check = async () => {
    try {
      await checkGetManagementMlJobsResolver(mlServices);
    } catch (e) {
      if (e.mlFeatureEnabledInSpace && e.isPlatinumOrTrialLicense === false) {
        setIsPlatinumOrTrialLicense(false);
      } else {
        setAccessDenied(true);
      }
    }
    setInitialized(true);
  };

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ContextWrapper = useCallback(
    spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  if (initialized === false) {
    return null;
  }

  function onCloseSyncFlyout() {
    setShowSyncFlyout(false);
  }

  if (accessDenied) {
    return <AccessDeniedPage />;
  }

  if (isPlatinumOrTrialLicense === false) {
    return <InsufficientLicensePage basePath={coreStart.http.basePath} />;
  }

  return (
    <RedirectAppLinks application={coreStart.application}>
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              ...coreStart,
              share,
              data,
              usageCollection,
              fieldFormats,
              spacesApi,
              mlServices,
            }}
          >
            <ContextWrapper feature={PLUGIN_ID}>
              <EnabledFeaturesContextProvider isServerless={isServerless} mlFeatures={mlFeatures}>
                <Router history={history}>
                  <EuiPageTemplate.Header
                    pageTitle={
                      <FormattedMessage
                        id="xpack.ml.management.jobsList.jobsListTitle"
                        defaultMessage="Machine Learning"
                      />
                    }
                    description={
                      <FormattedMessage
                        id="xpack.ml.management.jobsList.jobsListTagline"
                        defaultMessage="Identify, analyze, and process your data using advanced analysis techniques."
                      />
                    }
                    rightSideItems={[<DocsLink currentTabId={currentTabId} />]}
                    bottomBorder
                    paddingSize={'none'}
                  />

                  <EuiSpacer size="l" />

                  <EuiPageTemplate.Section
                    paddingSize={'none'}
                    id="kibanaManagementMLSection"
                    data-test-subj="mlPageStackManagementJobsList"
                  >
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <>
                          <EuiButtonEmpty
                            onClick={() => setShowSyncFlyout(true)}
                            data-test-subj="mlStackMgmtSyncButton"
                          >
                            {i18n.translate('xpack.ml.management.jobsList.syncFlyoutButton', {
                              defaultMessage: 'Synchronize saved objects',
                            })}
                          </EuiButtonEmpty>
                          {showSyncFlyout && <JobSpacesSyncFlyout onClose={onCloseSyncFlyout} />}
                          <EuiSpacer size="s" />
                        </>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ExportJobsFlyout
                          isDisabled={false}
                          currentTab={
                            currentTabId === 'trained-model' ? 'anomaly-detector' : currentTabId
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ImportJobsFlyout isDisabled={false} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <SpaceManagement spacesApi={spacesApi} setCurrentTab={setCurrentTabId} />
                  </EuiPageTemplate.Section>
                </Router>
              </EnabledFeaturesContextProvider>
            </ContextWrapper>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </RedirectAppLinks>
  );
};
