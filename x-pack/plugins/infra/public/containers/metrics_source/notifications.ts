import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const useSourceNotifier = () => {
  const { notifications } = useKibana();

  const updateFailure = (message?: string) => {
    notifications.toasts.danger({
      toastLifeTimeMs: 3000,
      title: i18n.translate('xpack.infra.sourceConfiguration.updateSuccessTitle', {
        defaultMessage: 'Configuration update failed',
      }),
      body: i18n.translate('xpack.infra.sourceConfiguration.updateSuccessTitle', {
        defaultMessage: `Changes for your Metrics configuration were not applied. ${message}`,
      }),
    });
  };

  const updateSuccess = () => {
    notifications.toasts.success({
      toastLifeTimeMs: 3000,
      title: i18n.translate('xpack.infra.sourceConfiguration.updateSuccessTitle', {
        defaultMessage: 'Configuration update successful',
      }),
      body: i18n.translate('xpack.infra.sourceConfiguration.updateSuccessTitle', {
        defaultMessage: 'Changes for your Metrics configuration have been successfully applied.',
      }),
    });
  };

  return {
    updateFailure,
    updateSuccess
  };
};
