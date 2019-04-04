/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { injectUICapabilities, UICapabilities } from 'ui/capabilities/react';
import chrome from 'ui/chrome';

interface Props {
  uiCapabilities: UICapabilities;
}

class UpdateBadgeComponent extends React.Component<Props> {
  public componentDidMount() {
    const { uiCapabilities } = this.props;
    chrome.badge.set(!uiCapabilities.apm.save ? 'readOnly' : undefined);
  }

  public render() {
    return null;
  }
}

export const UpdateBadge = injectUICapabilities(UpdateBadgeComponent);
