/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { CyIndexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { login, ROLE } from '../../../tasks/login';
import { ensurePolicyDetailsPageAuthzAccess } from '../../../screens/policy_details';
import type { EndpointArtifactPageId } from '../../../screens';
import {
  ensureArtifactPageAuthzAccess,
  ensureEndpointListPageAuthzAccess,
  ensureFleetPermissionDeniedScreen,
  ensurePolicyListPageAuthzAccess,
  getArtifactListEmptyStateAddButton,
  getConsoleHelpPanelResponseActionTestSubj,
  getEndpointManagementPageList,
  getEndpointManagementPageMap,
  getFleetAgentListTable,
  getNoPrivilegesPage,
  openConsoleFromEndpointList,
  openConsoleHelpPanel,
  openRowActionMenu,
  visitEndpointList,
  visitFleetAgentList,
  visitPolicyList,
} from '../../../screens';

// Failing: See https://github.com/elastic/kibana/issues/179274
describe.skip(
  'User Roles for Security Complete PLI with Endpoint Complete addon',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    const allPages = getEndpointManagementPageList();
    const pageById = getEndpointManagementPageMap();
    const consoleHelpPanelResponseActionsTestSubj = getConsoleHelpPanelResponseActionTestSubj();

    let loadedEndpoints: CyIndexEndpointHosts;

    before(() => {
      indexEndpointHosts().then((response) => {
        loadedEndpoints = response;
      });
    });

    after(() => {
      if (loadedEndpoints) {
        loadedEndpoints.cleanup();
      }
    });

    // roles `t1_analyst` and `t2_analyst` are very similar with exception of one page
    [ROLE.t1_analyst, ROLE.t2_analyst].forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const deniedPages = allPages.filter((page) => page.id !== 'endpointList');

        beforeEach(() => {
          login(roleName);
        });

        it('should have READ access to Endpoint list page', () => {
          ensureEndpointListPageAuthzAccess('read', true);
        });

        for (const { id, url, title } of deniedPages) {
          // T2 analyst has Read view to Response Actions log
          if (id === 'responseActionLog' && roleName === 't2_analyst') {
            it(`should have access to: ${title}`, () => {
              cy.visit(url);
              getNoPrivilegesPage().should('not.exist');
            });
          } else {
            it(`should NOT have access to: ${title}`, () => {
              cy.visit(url);
              getNoPrivilegesPage().should('exist');
            });
          }
        }

        it('should NOT have access to Fleet', () => {
          visitFleetAgentList();
          ensureFleetPermissionDeniedScreen();
        });

        it('should NOT have access to execute response actions', () => {
          visitEndpointList();
          openRowActionMenu().findByTestSubj('console').should('not.exist');
        });
      });
    });

    describe('for role: t3_analyst', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.hostIsolationExceptions,
        pageById.blocklist,
      ];

      const grantedResponseActions = pick(
        consoleHelpPanelResponseActionsTestSubj,
        'isolate',
        'release',
        'processes',
        'kill-process',
        'suspend-process',
        'get-file',
        'upload'
      );

      const deniedResponseActions = pick(consoleHelpPanelResponseActionsTestSubj, 'execute');

      beforeEach(() => {
        login(ROLE.t3_analyst);
      });

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('all', true);
      });

      it('should have read access to Endpoint Policy Management', () => {
        ensurePolicyListPageAuthzAccess('read', true);
        ensurePolicyDetailsPageAuthzAccess(
          loadedEndpoints.data.integrationPolicies[0].id,
          'read',
          true
        );
      });

      for (const { title, id } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });

      // FLAKY: https://github.com/elastic/kibana/issues/179281
      describe.skip('Response Actions access', () => {
        beforeEach(() => {
          visitEndpointList();
          openConsoleFromEndpointList();
          openConsoleHelpPanel();
        });

        for (const [action, testSubj] of Object.entries(grantedResponseActions)) {
          it(`should have access to execute action: ${action}`, () => {
            cy.getByTestSubj(testSubj).should('exist');
          });
        }

        for (const [action, testSubj] of Object.entries(deniedResponseActions)) {
          it(`should NOT have access to execute: ${action}`, () => {
            cy.getByTestSubj(testSubj).should('not.exist');
          });
        }
      });
    });

    describe('for role: threat_intelligence_analyst', () => {
      const deniedPages = allPages.filter(({ id }) => id !== 'blocklist' && id !== 'endpointList');

      beforeEach(() => {
        login(ROLE.threat_intelligence_analyst);
      });

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('read', true);
      });

      it(`should have CRUD access to: Blocklist`, () => {
        cy.visit(pageById.blocklist.url);
        getArtifactListEmptyStateAddButton(pageById.blocklist.id as EndpointArtifactPageId).should(
          'exist'
        );
      });

      for (const { url, title } of deniedPages) {
        it(`should NOT have access to: ${title}`, () => {
          cy.visit(url);
          getNoPrivilegesPage().should('exist');
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });

      it('should have access to Response Actions Log', () => {
        cy.visit(pageById.responseActionLog);
        getNoPrivilegesPage().should('not.exist');
      });

      it('should NOT have access to execute response actions', () => {
        visitEndpointList();
        openRowActionMenu().findByTestSubj('console').should('not.exist');
      });
    });

    describe('for role: rule_author', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
      ];

      beforeEach(() => {
        login(ROLE.rule_author);
      });

      for (const { id, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('all', true);
      });

      it('should have access to policy management', () => {
        visitPolicyList();
        getNoPrivilegesPage().should('not.exist');
      });

      it(`should have Read access only to: Host Isolation Exceptions`, () => {
        ensureArtifactPageAuthzAccess(
          'read',
          pageById.hostIsolationExceptions.id as EndpointArtifactPageId
        );
      });

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });

      it('should have access to Response Actions Log', () => {
        cy.visit(pageById.responseActionLog);
        getNoPrivilegesPage().should('not.exist');
      });

      it('should NOT have access to execute response actions', () => {
        visitEndpointList();
        openRowActionMenu().findByTestSubj('console').should('not.exist');
      });
    });

    describe('for role: soc_manager', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
        pageById.hostIsolationExceptions,
      ];
      const grantedAccessPages = [pageById.endpointList, pageById.policyList];

      beforeEach(() => {
        login(ROLE.soc_manager);
      });

      for (const { id, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      for (const { url, title } of grantedAccessPages) {
        it(`should have access to: ${title}`, () => {
          cy.visit(url);
          getNoPrivilegesPage().should('not.exist');
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });

      describe('Response Actions access', () => {
        beforeEach(() => {
          visitEndpointList();
          openConsoleFromEndpointList();
          openConsoleHelpPanel();
        });

        Object.entries(consoleHelpPanelResponseActionsTestSubj).forEach(([action, testSubj]) => {
          it(`should have access to execute action: ${action}`, () => {
            cy.getByTestSubj(testSubj).should('exist');
          });
        });
      });
    });

    describe('for role: endpoint_operations_analyst', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
        pageById.hostIsolationExceptions,
      ];

      const grantedAccessPages = [pageById.endpointList, pageById.policyList];

      beforeEach(() => {
        login(ROLE.endpoint_operations_analyst);
      });

      for (const { id, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      for (const { url, title } of grantedAccessPages) {
        it(`should have access to: ${title}`, () => {
          cy.visit(url);
          getNoPrivilegesPage().should('not.exist');
        });
      }

      Object.entries(consoleHelpPanelResponseActionsTestSubj).forEach(([action, testSubj]) => {
        it(`should have access to response action: ${action}`, () => {
          visitEndpointList();
          openConsoleFromEndpointList();
          openConsoleHelpPanel();
          cy.getByTestSubj(testSubj).should('exist');
        });
      });

      it('should have access to Fleet', () => {
        visitFleetAgentList();
        getFleetAgentListTable().should('exist');
      });
    });

    [ROLE.platform_engineer, ROLE.endpoint_policy_manager].forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const artifactPagesFullAccess = [
          pageById.trustedApps,
          pageById.eventFilters,
          pageById.blocklist,
          pageById.hostIsolationExceptions,
        ];
        const grantedAccessPages = [pageById.endpointList, pageById.policyList];

        beforeEach(() => {
          login(roleName);
        });

        for (const { id, title } of artifactPagesFullAccess) {
          it(`should have CRUD access to: ${title}`, () => {
            ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
          });
        }

        for (const { url, title } of grantedAccessPages) {
          it(`should have access to: ${title}`, () => {
            cy.visit(url);
            getNoPrivilegesPage().should('not.exist');
          });
        }

        it('should have access to Fleet', () => {
          visitFleetAgentList();
          getFleetAgentListTable().should('exist');
        });

        it('should have access to Response Actions Log', () => {
          cy.visit(pageById.responseActionLog);

          if (roleName === 'endpoint_policy_manager') {
            getNoPrivilegesPage().should('exist');
          } else {
            getNoPrivilegesPage().should('not.exist');
          }
        });

        it('should NOT have access to execute response actions', () => {
          visitEndpointList();
          openRowActionMenu().findByTestSubj('console').should('not.exist');
        });
      });
    });
  }
);
