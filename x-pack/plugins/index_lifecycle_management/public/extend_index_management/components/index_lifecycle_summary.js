/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import moment from 'moment-timezone';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiTitle,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n }  from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { getPolicyPath } from '../../services/navigation';
const HEADERS = {
  policy: i18n.translate('xpack.indexLifecycleMgmt.summary.headers.lifecyclePolicyHeader', {
    defaultMessage: 'Lifecycle policy',
  }),
  phase: i18n.translate('xpack.indexLifecycleMgmt.summary.headers.currentPhaseHeader', {
    defaultMessage: 'Current phase',
  }),
  action: i18n.translate('xpack.idxMgmt.indexLifecycleMgmtSummary.headers.nextActionHeader', {
    defaultMessage: 'Next action',
  }),
  action_time: i18n.translate('xpack.idxMgmt.indexLifecycleMgmtSummary.headers.nextActionTimeHeader', {
    defaultMessage: 'Next action time',
  }),
  failed_step: i18n.translate('xpack.idxMgmt.indexLifecycleMgmtSummary.headers.failedStepHeader', {
    defaultMessage: 'Failed step',
  }),
};
export class IndexLifecycleSummary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showStackPopover: false,
      showPhaseExecutionPopover: false,
    };
  }
  toggleStackPopover = () => {
    this.setState({ showStackPopover: !this.state.showStackPopover });
  }
  closeStackPopover = () => {
    this.setState({ showStackPopover: false });
  }
  togglePhaseExecutionPopover = () => {
    this.setState({ showPhaseExecutionPopover: !this.state.showPhaseExecutionPopover });
  }
  closePhaseExecutionPopover = () => {
    this.setState({ showPhaseExecutionPopover: false });
  }
  renderStackPopoverButton(ilm) {
    const button = (
      <EuiButtonEmpty onClick={this.toggleStackPopover}>
        <FormattedMessage
          defaultMessage="Stack trace"
          id="xpack.indexLifecycleMgmt.indexManagementTable.stackTraceButton"
        />
      </EuiButtonEmpty>
    );
    return (
      <EuiPopover
        id="stackPopover"
        button={button}
        isOpen={this.state.showStackPopover}
        closePopover={this.closeStackPopover}
      >
        <div style={{ maxHeight: '400px', width: '900px', overflowY: 'scroll' }}>
          <pre>{ilm.step_info.stack_trace}</pre>
        </div>
      </EuiPopover>
    );
  }
  renderPhaseExecutionPopoverButton(ilm) {
    if (!ilm.phase_execution) {
      return null;
    }
    const button = (
      <EuiLink onClick={this.togglePhaseExecutionPopover}>
        <FormattedMessage
          defaultMessage="Show phase definition"
          id="xpack.indexLifecycleMgmt.indexManagementTable.showPhaseDefinitionButton"
        />
      </EuiLink>
    );
    return (
      <EuiPopover
        key="phaseExecutionPopover"
        id="phaseExecutionPopover"
        button={button}
        isOpen={this.state.showPhaseExecutionPopover}
        closePopover={this.closePhaseExecutionPopover}
        withTitle
      >
        <EuiPopoverTitle>
          <FormattedMessage
            defaultMessage="Phase definition"
            id="xpack.indexLifecycleMgmt.indexManagementTable.phaseDefinitionTitle"
          />
        </EuiPopoverTitle>
        <div style={{ maxHeight: '400px', width: '400px', overflowY: 'scroll' }}>
          <pre>{JSON.stringify(ilm.phase_execution, null, 2)}</pre>
        </div>
      </EuiPopover>
    );
  }
  buildRows() {
    const { index: { ilm = {} } } = this.props;
    const rows = {
      left: [],
      right: []
    };
    Object.keys(HEADERS).forEach((fieldName, arrayIndex) => {
      const value = ilm[fieldName];
      let content;
      if (fieldName === 'action_time') {
        content = moment(value).format('YYYY-MM-DD HH:mm:ss');
      } else if (fieldName === 'policy') {
        content = (<EuiLink href={getPolicyPath(value)}>{value}</EuiLink>);
      } else {
        content = value;
      }
      content = content || '-';
      const cell = [
        <EuiDescriptionListTitle key={fieldName}>
          <strong>{HEADERS[fieldName]}</strong>
        </EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key={fieldName + "_desc"}>
          {content}
        </EuiDescriptionListDescription>
      ];
      if (arrayIndex % 2 === 0) {
        rows.left.push(cell);
      } else {
        rows.right.push(cell);
      }
    });
    rows.right.push(this.renderPhaseExecutionPopoverButton(ilm));
    return rows;
  }

  render() {
    const { index: { ilm = {} } } = this.props;
    if (!ilm.managed) {
      return null;
    }
    const { left, right } = this.buildRows();
    return (
      <Fragment>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              defaultMessage="Index lifecycle management"
              id="xpack.indexLifecycleMgmt.indexManagementTable.summaryTitle"
            />
          </h3>
        </EuiTitle>
        { ilm.step_info && ilm.step_info.type ? (
          <Fragment>
            <EuiSpacer size="s"/>
            <EuiCallOut
              color="danger"
              title={
                <FormattedMessage
                  defaultMessage="Index lifecycle error"
                  id="xpack.indexLifecycleMgmt.indexManagementTable.summaryErrorMessage"
                />
              }
              iconType="cross"
            >
              {ilm.step_info.type}: {ilm.step_info.reason}
              <EuiSpacer size="s" />
              {this.renderStackPopoverButton(ilm)}
            </EuiCallOut>
          </Fragment>
        ) : null}
        <EuiSpacer size="m"/>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList  type="column">
              {left}
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList  type="column">
              {right}
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}