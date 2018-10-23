/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface State {
  isOpen: boolean;
}

export class BetaBadge extends React.Component<{}, State> {
  public render() {
    return (
      <EuiPopover id="timeline-beta-badge">
        <EuiBadge color="hollow">Beta</EuiBadge>
      </EuiPopover>
    );
  }
}
