
import { getAllStats, getLocalStats } from '../../../../lib/telemetry';

export async function getStats(req, config, start, end, { _getAllStats = getAllStats, _getLocalStats = getLocalStats } = {}) {
  let response = [];

  if (config.get('xpack.monitoring.enabled')) {
    try {
      // attempt to collect stats from multiple clusters in monitoring data
      response = await _getAllStats(req, start, end);
    } catch (err) {
      // no-op
    }
  }

  if (!Array.isArray(response) || response.length === 0) {
    // return it as an array for a consistent API response
    response = [await _getLocalStats(req)];
  }

  return response;
}
