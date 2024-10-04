import { i18n } from '@kbn/i18n';


export type Query = {
    namespace: string;
    name: string;
    deployment: string;
    daemonset: string;
    period: string;
  };
  
  export type AIQuery = {
    content: string;
    assistant_id: string;
  };
  
  export const NAMESPACE_OPTIONS = [
    {
      id: 'default',
      label: i18n.translate('xpack.kubernetesObservability.k8sAPI.namespaceButtons.default', {
        defaultMessage: 'default',
      }),
    },
    {
      id: 'kube-system',
      label: i18n.translate('xpack.kubernetesObservability.k8sAPI.namespaceButtons.kube-system', {
        defaultMessage: 'kube-system',
      }),
    },
  ];
  
  export const NAMESPACE_SELECT_OPTIONS = [
    {
      value: 'all',
      inputDisplay: 'all',
      disabled: false
    },
    {
      value: 'default',
      inputDisplay: 'default',
      disabled: false
    },
    {
      value: 'kube-system',
      inputDisplay: 'kube-system',
      disabled: false
    },
  ];
  
  export const PERIODS_SELECT_OPTIONS = [
    {
      value: 'now-5m',
      inputDisplay: 'now-5m',
      disabled: false
    },
    {
      value: 'now-1h',
      inputDisplay: 'now-1h',
      disabled: false
    },
    {
      value: 'now-4h',
      inputDisplay: 'now-4h',
      disabled: false
    },
    {
      value: 'now-8h',
      inputDisplay: 'now-8h',
      disabled: false
    },
    {
      value: 'now-24h',
      inputDisplay: 'now-24h',
      disabled: false
    },
    {
      value: 'now-2d',
      inputDisplay: 'now-2d',
      disabled: false
    },
    {
      value: 'now-1w',
      inputDisplay: 'now-1w',
      disabled: false
    },
  ];
