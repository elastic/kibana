import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { logsLocatorMock } from '../../../context/apm_plugin/mock_apm_plugin_context';

const uptimeLocator = sharePluginMock.createLocator();
const local = vi.fn();
const viaGlobalJest = jest.fn();

describe('probe', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('a', () => {
    uptimeLocator.getRedirectUrl({});
    logsLocatorMock.getRedirectUrl({});
    local();
    viaGlobalJest();
    const g = globalThis as unknown as { jest?: { fn: unknown } };
    const w = window as unknown as { jest?: unknown };
    process.stdout.write(
      `PROBE ${vi.isMockFunction(uptimeLocator.getRedirectUrl)} ${g.jest === w.jest} ${
        g.jest?.fn === vi.fn
      }\n`
    );
    expect(uptimeLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
  });
  it('b', () => {
    expect(local).toHaveBeenCalledTimes(0);
    expect(viaGlobalJest).toHaveBeenCalledTimes(0);
    expect(uptimeLocator.getRedirectUrl).toHaveBeenCalledTimes(0);
    expect(logsLocatorMock.getRedirectUrl).toHaveBeenCalledTimes(0);
  });
});
