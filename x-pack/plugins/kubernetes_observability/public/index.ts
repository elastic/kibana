import { kubernetesObservability } from './plugin';

export function plugin() {
  return new kubernetesObservability();
}