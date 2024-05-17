import { getConnectorType } from './gemini';
import { SUB_ACTION } from '../../../common/gemini/constants';
import { GEMINI_CONNECTOR_ID, GEMINI_TITLE } from '../../../common/gemini/constants';
import { GeminiActionParams } from './types';

// Mock lazy imports to avoid actual loading in tests
jest.mock('react', () => ({
  lazy: jest.fn((callback) => callback()),
}));
jest.mock('./logo', () => ({ default: 'GeminiLogo' })); // Replace with actual logo component if needed
jest.mock('./connector', () => ({ default: 'GeminiConnectorFields' }));
jest.mock('./params', () => ({ default: 'GeminiActionParamsFields' }));
jest.mock('./dashboard_link', () => ({ default: 'GeminiDashboardLink' }));

// Mock i18n translations
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options?.defaultMessage || key),
  },
}));

describe('getConnectorType', () => {
  it('returns the correct connector type object', async () => {
    const connectorType = getConnectorType();
    expect(connectorType).toEqual({
      id: GEMINI_CONNECTOR_ID,
      iconClass: expect.any(Function),
      selectMessage: 'Send a request to Google Gemini.',
      actionTypeTitle: GEMINI_TITLE,
      validateParams: expect.any(Function),
      actionConnectorFields: expect.any(Function),
      actionParamsFields: expect.any(Function),
      actionReadOnlyExtraComponent: expect.any(Function),
    });
  });

  describe('validateParams', () => {
    it('returns no errors for valid RUN params with JSON body', async () => {
      const actionParams: GeminiActionParams = {
        subAction: SUB_ACTION.RUN,
        subActionParams: { body: '{"message": "Hello!"}' },
      };
      const result = await getConnectorType().validateParams(actionParams);
      expect(result).toEqual({ errors: { body: [], subAction: [] } });
    });

    it('returns errors for empty body in RUN/TEST params', async () => {
      const actionParams: GeminiActionParams = {
        subAction: SUB_ACTION.RUN,
        subActionParams: { body: '' },
      };
      const result = await getConnectorType().validateParams(actionParams);
      expect(result).toEqual({ errors: { body: ['BODY_REQUIRED'], subAction: [] } }); // Replace with actual translation
    });

    it('returns errors for invalid JSON body in RUN/TEST params', async () => {
      const actionParams: GeminiActionParams = {
        subAction: SUB_ACTION.RUN,
        subActionParams: { body: '{invalid json}' },
      };
      const result = await getConnectorType().validateParams(actionParams);
      expect(result).toEqual({ errors: { body: ['BODY_INVALID'], subAction: [] } }); // Replace with actual translation
    });

    it('returns no errors for valid TEST params with JSON body', async () => {
      const actionParams: GeminiActionParams = {
        subActionParams: { body: '{"message": "Hello!"}' },
        subAction: SUB_ACTION.TEST,
      };
      const result = await getConnectorType().validateParams(actionParams);
      expect(result).toEqual({ errors: { body: [], subAction: ['ACTION_REQUIRED'] } }); // Replace with actual translation
    });
  });
});
