/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

import type { FleetAuthz } from '../../../common';

import { calculateRouteAuthz } from './security';

describe('calculateRouteAuthz', () => {
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
        },
      },
    },
  });

  const getFleetAuthz = (authz: FleetAuthz = fleetAuthz) => authz;

  describe('with ANY', () => {
    it('should return TRUE if `any` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(true);
    });

    it('should return FALSE if `any` are false', () => {
      expect(
        calculateRouteAuthz(getFleetAuthz(), {
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
      ).toEqual(false);
    });
  });

  describe('with ALL', () => {
    it('should return TRUE if `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(true);
    });

    it('should return FALSE if not `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(false);
    });
  });

  describe('with ALL and ANY', () => {
    it('should return TRUE if `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(true);
    });

    it('should return TRUE if all OR any are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(true);
    });

    it('should return TRUE if `all` are not true but `any` are true ', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(true);
    });

    it('should return TRUE if `all` are true but `any` are not true ', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthz({
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
      ).toEqual(true);
    });
  });
});
