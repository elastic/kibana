/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

import type { FleetAuthz } from '../../../common';

import { calculateRouteAuthz } from './security';

describe('When using calculateRouteAuthz()', () => {
  const fleetAuthz = deepFreeze({
    fleet: {
      all: false,
      setup: false,
      readEnrollmentTokens: false,
      readAgentPolicies: false,
    },
    integrations: {
      readPackageInfo: false,
      readInstalledPackages: false,
      installPackages: false,
      upgradePackages: false,
      removePackages: false,
      uploadPackages: false,
      readPackageSettings: false,
      writePackageSettings: false,
      readIntegrationPolicies: false,
      writeIntegrationPolicies: false,
    },
    packagePrivileges: {
      endpoint: {
        actions: {
          writeEndpointList: {
            executePackageAction: false,
          },
          readEndpointList: {
            executePackageAction: false,
          },
          writeTrustedApplications: {
            executePackageAction: false,
          },
          readTrustedApplications: {
            executePackageAction: false,
          },
          writeHostIsolationExceptions: {
            executePackageAction: false,
          },
          readHostIsolationExceptions: {
            executePackageAction: false,
          },
          writeBlocklist: {
            executePackageAction: false,
          },
          readBlocklist: {
            executePackageAction: false,
          },
          writeEventFilters: {
            executePackageAction: false,
          },
          readEventFilters: {
            executePackageAction: false,
          },
          writePolicyManagement: {
            executePackageAction: false,
          },
          readPolicyManagement: {
            executePackageAction: false,
          },
          writeActionsLogManagement: {
            executePackageAction: false,
          },
          readActionsLogManagement: {
            executePackageAction: false,
          },
          writeHostIsolation: {
            executePackageAction: false,
          },
          writeProcessOperations: {
            executePackageAction: false,
          },
          writeFileOperations: {
            executePackageAction: false,
          },
          writeExecuteOperations: {
            executePackageAction: false,
          },
        },
      },

      someOtherPackage: {
        actions: {
          readSomeThing: {
            executePackageAction: false,
          },
        },
      },
    },
  });

  const getFleetAuthzMock = (authz: FleetAuthz = fleetAuthz) => authz;

  describe('with ANY object defined', () => {
    it('should grant access if `any` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            any: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: true,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: ['endpoint'],
      });
    });

    it('should deny access if `any` are false', () => {
      expect(
        calculateRouteAuthz(getFleetAuthzMock(), {
          any: {
            integrations: {
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              endpoint: {
                actions: {
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                  readBlocklist: {
                    executePackageAction: true,
                  },
                },
              },
            },
          },
        })
      ).toEqual({
        granted: false,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: undefined,
      });
    });
  });

  describe('with ALL object defined', () => {
    it('should grant access if `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                  readBlocklist: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });

    it('should deny access if not `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: false,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: undefined,
      });
    });
  });

  describe('with ALL and ANY', () => {
    it('should grant access if `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                  readBlocklist: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });

    it('should grant access if all OR any are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });

    it('should grant access if `all` are not true but `any` are true ', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },

              someOtherPackage: {
                actions: {
                  readSomeThing: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
                someOtherPackage: {
                  actions: {
                    readSomeThing: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: true,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: ['endpoint', 'someOtherPackage'],
      });
    });

    it('should grant access if `all` are true but `any` are not true ', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });
  });

  describe('and access is granted based on package privileges', () => {
    it('should exclude package names for which there is no access allowed', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
                // This package Authz is not allowed, so it should not be listed in `scopeDataToPackages`
                someOtherPackage: {
                  actions: {
                    readSomeThing: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: true,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: ['endpoint'],
      });
    });
  });
});
