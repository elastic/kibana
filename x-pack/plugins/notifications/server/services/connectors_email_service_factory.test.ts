/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  checkEmailServiceConfiguration,
  CheckEmailServiceParams,
  EmailServiceFactoryParams,
  getEmailService,
} from './connectors_email_service_factory';
import { LicensedEmailService } from './licensed_email_service';

const missingConnectorConfig = {
  connectors: {
    default: {},
  },
};

const invalidConnectorConfig = {
  connectors: {
    default: {
      email: 'someUnexistingConnectorId',
    },
  },
};

const validConnectorConfig = {
  connectors: {
    default: {
      email: 'validConnectorId',
    },
  },
};

describe('checkEmailServiceConfiguration()', () => {
  it('should throw an Error if Actions or Licensing plugins are not available', () => {
    expect(() => {
      const params: CheckEmailServiceParams = {
        config: validConnectorConfig,
        plugins: {
          actions: actionsMock.createSetup(),
        },
      };
      checkEmailServiceConfiguration(params);
    }).toThrowErrorMatchingInlineSnapshot(`"'actions' and 'licensing' plugins are required."`);
  });

  it('should throw an Error if no default email connector has been defined', () => {
    expect(() => {
      const params: CheckEmailServiceParams = {
        config: missingConnectorConfig,
        plugins: {
          actions: actionsMock.createSetup(),
        },
      };
      checkEmailServiceConfiguration(params);
    }).toThrowErrorMatchingInlineSnapshot(`"'actions' and 'licensing' plugins are required."`);
  });

  it('should throw an Error if the specified email connector is not a preconfigured connector', () => {
    expect(() => {
      const actions = actionsMock.createSetup();
      actions.isPreconfiguredConnector.mockImplementationOnce(
        (connectorId) => connectorId === 'validConnectorId'
      );
      const params: CheckEmailServiceParams = {
        config: invalidConnectorConfig,
        plugins: {
          actions,
        },
      };
      checkEmailServiceConfiguration(params);
    }).toThrowErrorMatchingInlineSnapshot(`"'actions' and 'licensing' plugins are required."`);
  });

  it('should not throw an Error if required plugins are present and the specified email connector is valid', () => {
    expect(() => {
      const actions = actionsMock.createSetup();
      actions.isPreconfiguredConnector.mockImplementationOnce(
        (connectorId) => connectorId === 'validConnectorId'
      );
      const params: CheckEmailServiceParams = {
        config: validConnectorConfig,
        plugins: {
          actions,
          licensing: licensingMock.createSetup(),
        },
      };
      checkEmailServiceConfiguration(params);
    }).not.toThrowError();
  });
});

describe('getEmailService()', () => {
  it('returns undefined if Actions or Licensing plugins are not available', () => {
    const params: EmailServiceFactoryParams = {
      config: validConnectorConfig,
      plugins: {
        licensing: licensingMock.createStart(),
      },
      logger: loggerMock.create(),
    };
    const email = getEmailService(params);
    expect(email).toBeUndefined();
  });

  it('returns undefined if default connector has not been specified', () => {
    const params: EmailServiceFactoryParams = {
      config: missingConnectorConfig,
      plugins: {
        actions: actionsMock.createStart(),
        licensing: licensingMock.createStart(),
      },
      logger: loggerMock.create(),
    };
    const email = getEmailService(params);
    expect(email).toBeUndefined();
  });

  it('returns an instance of ConnectorsEmailService if all params have been specified', () => {
    const params: EmailServiceFactoryParams = {
      config: invalidConnectorConfig, // note that the factory does not check for connector validity
      plugins: {
        actions: actionsMock.createStart(),
        licensing: licensingMock.createStart(),
      },
      logger: loggerMock.create(),
    };
    const email = getEmailService(params);
    expect(email).toBeInstanceOf(LicensedEmailService);
  });
});
