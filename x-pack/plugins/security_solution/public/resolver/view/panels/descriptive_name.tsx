/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from 'react-intl';

import React from 'react';

import {
  isLegacyEvent,
  processName,
  entityId as entityID,
} from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';

/**
 * Based on the ECS category of the event, attempt to provide a more descriptive name
 * (e.g. the `event.registry.key` for `registry` or the `dns.question.name` for `dns`, etc.).
 * This function returns the data in the form of `{subject, descriptor}` where `subject` will
 * tend to be the more distinctive term (e.g. 137.213.212.7 for a network event) and the
 * `descriptor` can be used to present more useful/meaningful view (e.g. `inbound 137.213.212.7`
 * in the example above).
 * see: https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html
 * @param event The ResolverEvent to get the descriptive name for
 */
export function DescriptiveName({ event }: { event: ResolverEvent }) {
  if (isLegacyEvent(event)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.legacyEventLabel"
        defaultMessage="{ processName }"
        values={{ processName: processName(event) }}
      />
    );
  }

  type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
  const partialEvent: DeepPartial<ResolverEvent> = event;

  /**
   * This list of attempts can be expanded/adjusted as the underlying model changes over time:
   */

  // Stable, per ECS 1.5: https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html

  if (partialEvent.network?.forwarded_ip) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.networkEventLabel"
        defaultMessage="{ networkDirection } { forwardedIP }"
        values={{
          forwardedIP: String(partialEvent.network?.forwarded_ip),
          networkDirection: String(partialEvent.network?.direction),
        }}
      />
    );
  }

  if (partialEvent.file?.path) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.fileEventLabel"
        defaultMessage="{ filePath }"
        values={{
          filePath: String(partialEvent.file?.path),
        }}
      />
    );
  }

  if (partialEvent.registry?.path) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.registryPathLabel"
        defaultMessage="{ registryPath }"
        values={{
          registryPath: String(partialEvent.registry?.path),
        }}
      />
    );
  }

  if (partialEvent.registry?.key) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.registryKeyLabel"
        defaultMessage="{ registryKey }"
        values={{
          registryKey: String(partialEvent.registry?.key),
        }}
      />
    );
  }

  if (partialEvent.dns?.question?.name) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.dnsQuestionNameLabel"
        defaultMessage="{ dnsQuestionName }"
        values={{
          dnsQuestionName: String(partialEvent.dns?.question?.name),
        }}
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.securitySolution.resolver.eventDescription.entityIDLabel"
      defaultMessage="{ entityID }"
      values={{
        dnsQuestionName: entityID(event),
      }}
    />
  );
}
