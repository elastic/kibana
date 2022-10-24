/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorsEmailService } from './connectors_email_service';
import {
  checkEmailServiceConfiguration,
  CheckEmailServiceParams,
  EmailServiceFactoryParams,
  getEmailService,
} from './connectors_email_service_factory';

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
  it('should throw an Error if Actions plugin is not available', () => {
    expect(() => {
      const params: CheckEmailServiceParams = {
        config: validConnectorConfig,
        plugins: {},
      };
      checkEmailServiceConfiguration(params);
    }).toThrowErrorMatchingInlineSnapshot(`"'actions' plugin not available."`);
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
    }).toThrowErrorMatchingInlineSnapshot(`"Email connector not specified."`);
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
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unexisting email connector 'someUnexistingConnectorId' specified."`
    );
  });

  it('should not throw an Error if actions plugin is defined and the specified email connector is valid', () => {
    expect(() => {
      const actions = actionsMock.createSetup();
      actions.isPreconfiguredConnector.mockImplementationOnce(
        (connectorId) => connectorId === 'validConnectorId'
      );
      const params: CheckEmailServiceParams = {
        config: validConnectorConfig,
        plugins: {
          actions,
        },
      };
      checkEmailServiceConfiguration(params);
    }).not.toThrowError();
  });
});

describe('getEmailService()', () => {
  it('returns undefined if Actions plugin start contract is not available', () => {
    const params: EmailServiceFactoryParams = {
      config: validConnectorConfig,
      plugins: {},
    };
    const email = getEmailService(params);
    expect(email).toBeUndefined();
  });

  it('returns undefined if default connector has not been specified', () => {
    const params: EmailServiceFactoryParams = {
      config: missingConnectorConfig,
      plugins: {
        actions: actionsMock.createStart(),
      },
    };
    const email = getEmailService(params);
    expect(email).toBeUndefined();
  });

  it('returns an instance of ConnectorsEmailService if all params have been specified', () => {
    const params: EmailServiceFactoryParams = {
      config: invalidConnectorConfig, // note that the factory does not check for connector validity
      plugins: {
        actions: actionsMock.createStart(),
      },
    };
    const email = getEmailService(params);
    expect(email).toBeInstanceOf(ConnectorsEmailService);
  });
});
