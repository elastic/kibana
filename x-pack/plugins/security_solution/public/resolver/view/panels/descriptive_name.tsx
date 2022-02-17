/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  isLegacyEventSafeVersion,
  processNameSafeVersion,
  entityIDSafeVersion,
} from '../../../../common/endpoint/models/event';
import { SafeResolverEvent } from '../../../../common/endpoint/types';

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
export function DescriptiveName({ event }: { event: SafeResolverEvent }) {
  if (isLegacyEventSafeVersion(event)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.legacyEventLabel"
        defaultMessage="{ processName }"
        values={{ processName: processNameSafeVersion(event) }}
      />
    );
  }

  /**
   * This list of attempts can be expanded/adjusted as the underlying model changes over time:
   */

  // Stable, per ECS 1.5: https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html

  if (event.network?.forwarded_ip) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.networkEventLabel"
        defaultMessage="{ networkDirection } { forwardedIP }"
        values={{
          forwardedIP: String(event.network?.forwarded_ip),
          networkDirection: String(event.network?.direction),
        }}
      />
    );
  }

  if (event.file?.path) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.fileEventLabel"
        defaultMessage="{ filePath }"
        values={{
          filePath: String(event.file?.path),
        }}
      />
    );
  }

  if (event.registry?.path) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.registryPathLabel"
        defaultMessage="{ registryPath }"
        values={{
          registryPath: String(event.registry?.path),
        }}
      />
    );
  }

  if (event.registry?.key) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.registryKeyLabel"
        defaultMessage="{ registryKey }"
        values={{
          registryKey: String(event.registry?.key),
        }}
      />
    );
  }

  if (event.dns?.question?.name) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.resolver.eventDescription.dnsQuestionNameLabel"
        defaultMessage="{ dnsQuestionName }"
        values={{
          dnsQuestionName: String(event.dns?.question?.name),
        }}
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.securitySolution.resolver.eventDescription.entityIDLabel"
      defaultMessage="{ entityID }"
      values={{
        entityID: entityIDSafeVersion(event),
      }}
    />
  );
}
