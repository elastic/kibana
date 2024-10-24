import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export class kubernetesObservability implements Plugin {
  public setup(core: CoreSetup) {
    // Register an application into the side navigation menu
    // const results =  core.http.get('/kubernetes/nodes/memory');
    core.application.register({
      id: 'kubernetesObservability',
      title: i18n.translate('xpack.fleet.K8sObservabilityAppTitle', {
        defaultMessage: 'Kubernetes Observability',
      }),
      order: 9019,
      euiIconType: 'logoKubernetes',
      mount: async (params: AppMountParameters) => {
        const { renderApp } = await import('./apps/kube_insight');

        return renderApp(core, params);
      },
    });
  }
  public start(core: CoreStart) {
    console.log("kubernetesObservability public started");
    // const results = await core.http.get('/kubernetes/nodes/memory');
    return {};
  }
  public stop() {}
}