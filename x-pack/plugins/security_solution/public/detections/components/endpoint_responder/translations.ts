
import { i18n } from '@kbn/i18n';

export const NOT_FROM_ENDPOINT_HOST_TOOLTIP = i18n.translate(
    'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.notSupportedTooltip',
    {
      defaultMessage: 'Add the Elastic Defend integration via Elastic Agent to enable this feature',
    }
  );
  export const HOST_ENDPOINT_UNENROLLED_TOOLTIP = i18n.translate(
    'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.unenrolledTooltip',
    { defaultMessage: 'Host is no longer enrolled with the Elastic Defend integration' }
  );
  export const LOADING_ENDPOINT_DATA_TOOLTIP = i18n.translate(
    'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.loadingTooltip',
    { defaultMessage: 'Loading' }
  );
  export const METADATA_API_ERROR_TOOLTIP = i18n.translate(
    'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.generalMetadataErrorTooltip',
    { defaultMessage: 'Failed to retrieve Endpoint metadata' }
  );