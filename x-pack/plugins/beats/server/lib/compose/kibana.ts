import { CMServerLibs, CMDomainLibs } from '../lib';
import { InfraKibanaBackendFrameworkAdapter } from '../adapters/famework/kibana/kibana_framework_adapter';

import { Server } from 'hapi';

export function compose(server: Server): CMServerLibs {
  const framework = new InfraKibanaBackendFrameworkAdapter(server);

  const domainLibs: CMDomainLibs = {};

  const libs: CMServerLibs = {
    framework,
    ...domainLibs,
  };

  return libs;
}
