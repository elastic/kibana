import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { getConnectorType, configValidator } from './index';
import {ActionsConfigurationUtilities} from 'x-pack/plugins/actions/server/actions_config';
import { Config } from '../../../common/gemini/types';


jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options?.defaultMessage || key), // Mock translation
  },
}));

jest.mock('@kbn/actions-plugin/server', () => ({
  urlAllowListValidator: jest.fn(() => jest.fn()), // Mock validator
}));

const mockConfigurationUtilities: ActionsConfigurationUtilities = {
    isHostnameAllowed: jest.fn().mockReturnValue(true), // Always allow hostname
    isUriAllowed: jest.fn().mockReturnValue(true),       // Always allow URI
    isActionTypeEnabled: jest.fn().mockReturnValue(true), // Always enable action type
    ensureHostnameAllowed: jest.fn(),              // Empty implementation for now
    ensureUriAllowed: jest.fn(),                  // Empty implementation for now
    ensureActionTypeEnabled: jest.fn(),             // Empty implementation for now
    getSSLSettings: jest.fn(),                    // Empty implementation for now
    getProxySettings: jest.fn(),                   // Empty implementation for now
    getResponseSettings: jest.fn(),                 // Empty implementation for now
    getCustomHostSettings: jest.fn(),               // Empty implementation for now
    getMicrosoftGraphApiUrl: jest.fn().mockReturnValue('https://graph.microsoft.com/v1.0'), 
    getMicrosoftGraphApiScope: jest.fn().mockReturnValue('https://graph.microsoft.com/.default'), 
    getMicrosoftExchangeUrl: jest.fn().mockReturnValue('https://outlook.office.com/api/v2.0'), 
    getMaxAttempts: jest.fn().mockReturnValue(3),      
    validateEmailAddresses: jest.fn(),             
    enableFooterInEmail: jest.fn().mockReturnValue(true),  
    getMaxQueued: jest.fn().mockReturnValue(100),      
  };
  
  
const mockValidatorServices: ValidatorServices = {
    configurationUtilities: mockConfigurationUtilities
  };
  

describe('getConnectorType', () => {
  it('should return the correct connector type', () => {
    const connectorType = getConnectorType();

    expect(connectorType.id).toBe('GEMINI_CONNECTOR_ID'); // Replace with actual ID
    expect(connectorType.name).toBe('GEMINI_TITLE'); // Replace with actual title
    expect(connectorType).toHaveProperty('getService'); 
    expect(connectorType.schema).toBeDefined();
    expect(connectorType.supportedFeatureIds).toBeDefined();
    expect(connectorType.minimumLicenseRequired).toBe('enterprise');
    expect(connectorType.renderParameterTemplates).toBeDefined();
  });
});

describe('configValidator', () => {
  const mockConfig: Config = { apiUrl: 'https://example.com/api',defaultModel: 'string', gcpRegion: 'string', gcpProjectID: 'string' }; // Sample valid config

  it('should return the config object if valid', () => {
    const validatedConfig = configValidator(mockConfig, mockValidatorServices);
    expect(validatedConfig).toEqual(mockConfig);
  });

  it('should throw an error if apiUrl is invalid', () => {
    const invalidConfig = { apiUrl: 'invalid-url' ,defaultModel: 'string', gcpRegion: 'string', gcpProjectID: 'string' };
    expect(() => configValidator(invalidConfig, mockValidatorServices)).toThrow(
      'Error configuring Google Gemini action: Error: Invalid URL: invalid-url'
    );
  });

  // Add more tests to cover different scenarios, e.g., urlAllowListValidator failures 
});
