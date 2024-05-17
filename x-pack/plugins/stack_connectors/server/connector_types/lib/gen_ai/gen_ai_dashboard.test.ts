import { getDashboard } from './gen_ai_dashboard'; // Replace with your actual file path
import { getDashboardTitle } from './gen_ai_dashboard';
import { 
  GEMINI_TITLE, GEMINI_CONNECTOR_ID
} from 'x-pack/plugins/stack_connectors/common/gemini/constants'; // Replace with your actual constants file path

jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('getDashboard', () => {
  const dashboardId = 'test-dashboard-id';

  it.each([
    ['Gemini', GEMINI_TITLE, GEMINI_CONNECTOR_ID]
  ])('returns correct dashboard for %s provider', (provider, expectedTitle, expectedActionTypeId) => {
    const dashboard = getDashboard(provider as 'OpenAI' | 'Bedrock' | 'Gemini', dashboardId);

    // Snapshot test for the entire dashboard object
    expect(dashboard).toMatchSnapshot();

    // Additional specific assertions (optional)
    expect(dashboard.id).toBe(dashboardId);
    expect(dashboard.attributes.title).toBe(getDashboardTitle(expectedTitle));
    expect(dashboard.attributes.description).toContain(expectedTitle);

    // Ensure the correct actionTypeId is used in the query
    const panelsJSON = JSON.parse(dashboard.attributes.panelsJSON);
    const searchSourceJSONPanel0 = JSON.parse(panelsJSON[1].embeddableConfig.attributes.state.query.query);
    const searchSourceJSONPanel1 = JSON.parse(panelsJSON[2].embeddableConfig.attributes.state.query.query);
    expect(searchSourceJSONPanel0['kibana.saved_objects']['type_id']).toBe(expectedActionTypeId);
    expect(searchSourceJSONPanel1['kibana.saved_objects']['type_id']).toBe(expectedActionTypeId);
  });
});
