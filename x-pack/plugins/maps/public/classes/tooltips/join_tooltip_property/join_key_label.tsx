/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { asyncMap } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { InnerJoin } from '../../joins/inner_join';

interface Props {
  leftFieldName: string;
  innerJoins: InnerJoin[];
}

interface State {
  rightSourceLabels: string[];
}

export class JoinKeyLabel extends Component<Props, State> {
  private _isMounted = false;

  state: State = { rightSourceLabels: [] };

  componentDidMount() {
    this._isMounted = true;
    this._loadRightSourceLabels();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadRightSourceLabels() {
    const rightSourceLabels = await asyncMap(this.props.innerJoins, async (innerJoin) => {
      const rightSource = innerJoin.getRightJoinSource();
      const termField = rightSource.getTermField();
      return `'${await termField.getLabel()}'`;
    });

    if (this._isMounted) {
      this.setState({ rightSourceLabels });
    }
  }

  render() {
    if (this.state.rightSourceLabels.length === 0) {
      return this.props.leftFieldName;
    }

    const content = i18n.translate('xpack.maps.tooltip.joinPropertyTooltipContent', {
      defaultMessage: `Shared key '{leftFieldName}' is joined with {rightSources}`,
      values: {
        leftFieldName: this.props.leftFieldName,
        rightSources: this.state.rightSourceLabels.join(','),
      },
    });
    return (
      <>
        {this.props.leftFieldName}
        <EuiToolTip position="bottom" content={content}>
          <EuiIcon type="link" />
        </EuiToolTip>
      </>
    );
  }
}
