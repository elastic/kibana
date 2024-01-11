import {
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
  LOW_PRIORITY_ACTION_ID,
  MEDIUM_PRIORITY_ACTION_ID,
} from '../../../../../../common/constants';

export function getActionGroupFromReason(reason: string): string {
  const prefix = reason.split(':')[0]?.toLowerCase() ?? undefined;
  switch (prefix) {
    case 'critical':
      return ALERT_ACTION_ID;
    case 'high':
      return HIGH_PRIORITY_ACTION_ID;
    case 'medium':
      return MEDIUM_PRIORITY_ACTION_ID;
    case 'low':
    default:
      return LOW_PRIORITY_ACTION_ID;
  }
}
