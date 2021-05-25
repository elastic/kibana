/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';

interface LocationLinkProps {
  location?: string | null;
  textSize?: 'xs' | 's' | 'm';
}

const locationDocsLink =
  'https://www.elastic.co/guide/en/beats/heartbeat/current/configuration-observer-options.html';

/**
 * Renders some location text, or directs the user to the docs where
 * they can learn to configure location.
 */
export const LocationLink = ({ location, textSize }: LocationLinkProps) => {
  return location ? (
    <EuiText size={textSize || 's'} grow={false}>
      {location}
    </EuiText>
  ) : (
    <EuiLink href={locationDocsLink} target="_blank">
      {i18n.translate('xpack.uptime.monitorList.geoName.helpLinkAnnotation', {
        defaultMessage: 'Add location',
        description:
          'Text that instructs the user to navigate to our docs to add a geographic location to their data',
      })}
    </EuiLink>
  );
};
