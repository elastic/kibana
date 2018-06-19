import { CMServerLibs } from './lib/lib';
import { beatsIndexTemplate } from './utils/index_templates';

export const initManagementServer = (libs: CMServerLibs) => {
  libs.framework.installIndexTemplate('beats-template', beatsIndexTemplate);
};
