/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import chrome from 'ui/chrome';

interface Props {
  uiCapabilities: UICapabilities;
  intl: InjectedIntl;
}

class UpdateBadgeComponent extends React.Component<Props> {
  public componentDidMount() {
    const { uiCapabilities, intl } = this.props;
    chrome.badge.set(
      !uiCapabilities.apm.save
        ? {
            text: intl.formatMessage({
              defaultMessage: 'Read only',
              id: 'xpack.apm.header.badge.readOnly.text'
            }),
            tooltip: intl.formatMessage({
              defaultMessage: 'Unable to save',
              id: 'xpack.apm.header.badge.readOnly.tooltip'
            }),
            iconType: 'glasses'
          }
        : undefined
    );
  }

  public render() {
    return null;
  }
}

export const UpdateBadge = injectUICapabilities(
  injectI18n(UpdateBadgeComponent)
);
