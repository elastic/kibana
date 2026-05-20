import type { CoreStart } from '@kbn/core/public';
import { type ApmPluginStartDeps } from '../../plugin';
export type StartServices<AdditionalServices extends object = {}> = CoreStart & ApmPluginStartDeps & AdditionalServices;
declare const useTypedKibana: <AdditionalServices extends object = {}>() => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & ApmPluginStartDeps & AdditionalServices>;
export { useTypedKibana as useKibana };
