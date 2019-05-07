import { Feature } from 'x-pack/plugins/xpack_main/types';
import { UICapabilities } from 'ui/capabilities';
import { UICapabilitiesGroup } from '.';

export class FeatureUICapabilitiesGroup implements UICapabilitiesGroup {
  constructor(private feature: Feature) {}

  disable(uiCapabilities: UICapabilities) {
    const featureCapabilities = uiCapabilities[this.feature.id];
    if (featureCapabilities == null) {
      return;
    }

    for (const capabilityId of Object.keys(featureCapabilities)) {
      if (typeof featureCapabilities[capabilityId] === 'boolean') {
        featureCapabilities[capabilityId] = false;
        continue;
      }

      for( const subCapabilityId of Object.keys(featureCapabilities[capabilityId])) {
        (featureCapabilities[capabilityId] as Record<string, boolean>)[subCapabilityId] = false;
      }
    }
  }
}
