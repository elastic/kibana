/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateEsPrivilegeResponse } from "./validate_es_response";
import { buildLegacyIndexPrivileges } from "./privileges";

const resource = 'foo-resource';
const application = 'foo-application';
const kibanaIndex = '.kibana';

const commonResponse = {
  username: 'user',
  has_all_requested: true,
};

describe('validateEsPrivilegeResponse', () => {
  const legacyIndexResponse = {
    [kibanaIndex]: {
      'create': true,
      'delete': true,
      'read': true,
      'view_index_metadata': true,
    }
  };

  it('should validate a proper response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource]: {
            action1: true,
            action2: true,
            action3: true
          }
        }
      },
      index: legacyIndexResponse
    };

    const result = validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex);
    expect(result).toEqual(response);
  });

  it('fails validation when an action is missing in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource]: {
            action1: true,
            action3: true
          }
        }
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an extra action is present in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource]: {
            action1: true,
            action2: true,
            action3: true,
            action4: true,
          }
        }
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an action is malformed in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource]: {
            action1: true,
            action2: true,
            action3: 'not a boolean',
          }
        }
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an extra application is present in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource]: {
            action1: true,
            action2: true,
            action3: true,
          }
        },
        otherApplication: {
          [resource]: {
            action1: true,
            action2: true,
            action3: true,
          }
        }
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the requested application is missing from the response', () => {
    const response = {
      ...commonResponse,
      application: {},
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the "application" property is missing from the response', () => {
    const response = {
      ...commonResponse,
      index: {}
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the expected resource property is missing from the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {}
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an unexpected resource property is present in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          'other-resource': {
            action1: true,
            action2: true,
            action3: true,
          }
        }
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the resource propertry is malformed in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource]: 'not-an-object'
        }
      },
      index: legacyIndexResponse
    };

    expect(() =>
      validateEsPrivilegeResponse(response, application, ['action1', 'action2', 'action3'], [resource], kibanaIndex)
    ).toThrowErrorMatchingSnapshot();
  });

  describe('legacy', () => {
    it('should validate a proper response', () => {
      const response = {
        ...commonResponse,
        application: {
          [application]: {
            [resource]: {
              action1: true
            }
          }
        },
        index: legacyIndexResponse
      };

      const result = validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex);
      expect(result).toEqual(response);
    });

    it('should fail if the index property is missing', () => {
      const response = {
        ...commonResponse,
        application: {
          [application]: {
            [resource]: {
              action1: true
            }
          }
        }
      };

      expect(() =>
        validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex)
      ).toThrowErrorMatchingSnapshot();
    });

    it('should fail if the kibana index is missing from the response', () => {
      const response = {
        ...commonResponse,
        application: {
          [application]: {
            [resource]: {
              action1: true
            }
          }
        },
        index: {}
      };

      expect(() =>
        validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex)
      ).toThrowErrorMatchingSnapshot();
    });

    it('should fail if the index privilege response returns an extra index', () => {
      const response = {
        ...commonResponse,
        application: {
          [application]: {
            [resource]: {
              action1: true
            }
          }
        },
        index: {
          ...legacyIndexResponse,
          'anotherIndex': {
            foo: true
          }
        }
      };

      expect(() =>
        validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex)
      ).toThrowErrorMatchingSnapshot();
    });

    it('should fail if the index privilege response contains an extra privilege', () => {
      const response = {
        ...commonResponse,
        application: {
          [application]: {
            [resource]: {
              action1: true
            }
          }
        },
        index: {
          [kibanaIndex]: {
            ...legacyIndexResponse[kibanaIndex],
            'foo-permission': true
          }
        }
      };

      expect(() =>
        validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex)
      ).toThrowErrorMatchingSnapshot();
    });

    buildLegacyIndexPrivileges().forEach(privilege => {
      test(`should fail if the ${privilege} index privilege is missing from the response`, () => {
        const response = {
          ...commonResponse,
          application: {
            [application]: {
              [resource]: {
                action1: true
              }
            }
          },
          index: {
            [kibanaIndex]: {
              ...legacyIndexResponse[kibanaIndex]
            }
          }
        };

        delete response.index[kibanaIndex][privilege];

        expect(() =>
          validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex)
        ).toThrowErrorMatchingSnapshot();
      });

      test(`should fail if the ${privilege} index privilege is malformed`, () => {
        const response = {
          ...commonResponse,
          application: {
            [application]: {
              [resource]: {
                action1: true
              }
            }
          },
          index: {
            [kibanaIndex]: {
              ...legacyIndexResponse[kibanaIndex]
            }
          }
        };

        response.index[kibanaIndex][privilege] = 'not a boolean';

        expect(() =>
          validateEsPrivilegeResponse(response, application, ['action1'], [resource], kibanaIndex)
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });
});
