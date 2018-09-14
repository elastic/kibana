import { workpad } from './workpad';
import { socketApi } from './socket';
import { translate } from './translate';
import { esFields } from './es_fields';
import { esIndices } from './es_indices';
import { getAuth } from './get_auth';
import { plugins } from './plugins';

export function routes(server) {
  workpad(server);
  socketApi(server);
  translate(server);
  esFields(server);
  esIndices(server);
  getAuth(server);
  plugins(server);
}
