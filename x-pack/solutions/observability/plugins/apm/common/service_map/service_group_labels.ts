/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** "3 services", for the member count shown on a group and on the box of an open group. */
export const getServiceGroupMemberCountLabel = (memberCount: number): string =>
  i18n.translate('xpack.apm.serviceMap.serviceGroupNode.memberCountLabel', {
    defaultMessage: '{count} {count, plural, one {service} other {services}}',
    values: { count: memberCount },
  });

/**
 * Accessible name of a closed group. It is the `ariaLabel` of the node, which React Flow puts on the
 * element that takes the focus, and the start of the label of the group inside it.
 */
export const getServiceGroupAriaLabel = ({
  groupName,
  memberCount,
}: {
  groupName: string;
  memberCount: number;
}): string =>
  i18n.translate('xpack.apm.serviceMap.serviceGroupNode.ariaLabel', {
    defaultMessage:
      'Service group: {groupName}, {count} {count, plural, one {service} other {services}}',
    values: { groupName, count: memberCount },
  });

/** Accessible name of the box of an open group, as for {@link getServiceGroupAriaLabel}. */
export const getServiceGroupBoxAriaLabel = ({
  groupName,
  memberCount,
}: {
  groupName: string;
  memberCount: number;
}): string =>
  i18n.translate('xpack.apm.serviceMap.serviceGroupBoxNode.ariaLabel', {
    defaultMessage:
      'Open service group: {groupName}, {count} {count, plural, one {service} other {services}}. Press Enter or Escape to close the group.',
    values: { groupName, count: memberCount },
  });
