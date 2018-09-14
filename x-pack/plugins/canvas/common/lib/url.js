import { isValid as isValidDataUrl } from '../../common/lib/dataurl';
import { isValid as isValidHttpUrl } from '../../common/lib/httpurl';

export function isValid(url) {
  return isValidDataUrl(url) || isValidHttpUrl(url);
}
