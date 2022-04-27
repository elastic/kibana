/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiCodeBlock,
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

import { ApplicationStart } from '@kbn/core/public';
import { getPolicyEditPath } from '../../application/services/navigation';
import { Index, IndexLifecyclePolicy } from '../../../common/types';

const getHeaders = (): Array<[keyof IndexLifecyclePolicy, string]> => {
  return [
    [
      'policy',
      i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.lifecyclePolicyHeader',
        {
          defaultMessage: 'Lifecycle policy',
        }
      ),
    ],
    [
      'phase',
      i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentPhaseHeader',
        {
          defaultMessage: 'Current phase',
        }
      ),
    ],
    [
      'action',
      i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentActionHeader',
        {
          defaultMessage: 'Current action',
        }
      ),
    ],
    [
      'action_time_millis',
      i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentActionTimeHeader',
        {
          defaultMessage: 'Current action time',
        }
      ),
    ],
    [
      'failed_step',
      i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.failedStepHeader',
        {
          defaultMessage: 'Failed step',
        }
      ),
    ],
  ];
};

interface Props {
  index: Index;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}
interface State {
  showStackPopover: boolean;
  showPhaseExecutionPopover: boolean;
}

export class IndexLifecycleSummary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showStackPopover: false,
      showPhaseExecutionPopover: false,
    };
  }
  toggleStackPopover = () => {
    this.setState({ showStackPopover: !this.state.showStackPopover });
  };
  closeStackPopover = () => {
    this.setState({ showStackPopover: false });
  };
  togglePhaseExecutionPopover = () => {
    this.setState({ showPhaseExecutionPopover: !this.state.showPhaseExecutionPopover });
  };
  closePhaseExecutionPopover = () => {
    this.setState({ showPhaseExecutionPopover: false });
  };
  renderPhaseExecutionPopoverButton(ilm: IndexLifecyclePolicy) {
    const button = (
      <EuiLink onClick={this.togglePhaseExecutionPopover}>
        <FormattedMessage
          defaultMessage="Show definition"
          id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.showPhaseDefinitionButton"
        />
      </EuiLink>
    );
    return (
      <Fragment key="phaseDefinition">
        <EuiDescriptionListTitle key="phaseDefinition_title">
          <strong>
            <FormattedMessage
              defaultMessage="Phase definition"
              id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.showPhaseDefinitionDescriptionTitle"
            />
          </strong>
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription key="phaseDefinition_desc">
          <EuiPopover
            key="phaseExecutionPopover"
            id="phaseExecutionPopover"
            button={button}
            isOpen={this.state.showPhaseExecutionPopover}
            closePopover={this.closePhaseExecutionPopover}
          >
            <EuiPopoverTitle>
              <FormattedMessage
                defaultMessage="Phase definition"
                id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.phaseDefinitionTitle"
              />
            </EuiPopoverTitle>
            <EuiCodeBlock lang="json">{JSON.stringify(ilm.phase_execution, null, 2)}</EuiCodeBlock>
          </EuiPopover>
        </EuiDescriptionListDescription>
      </Fragment>
    );
  }
  buildRows() {
    const {
      index: { ilm },
    } = this.props;
    const headers = getHeaders();
    const rows: {
      left: JSX.Element[];
      right: JSX.Element[];
    } = {
      left: [],
      right: [],
    };
    headers.forEach(([fieldName, label], arrayIndex) => {
      const value: any = ilm[fieldName];
      let content;
      if (fieldName === 'action_time_millis') {
        content = moment(value).format('YYYY-MM-DD HH:mm:ss');
      } else if (fieldName === 'policy') {
        content = (
          <EuiLink
            href={this.props.getUrlForApp('management', {
              path: `data/index_lifecycle_management/${getPolicyEditPath(value)}`,
            })}
          >
            {value}
          </EuiLink>
        );
      } else {
        content = value;
      }
      content = content || '-';
      const cell = (
        <Fragment key={String(arrayIndex)}>
          <EuiDescriptionListTitle key={fieldName}>
            <strong>{label}</strong>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription key={fieldName + '_desc'}>
            {content}
          </EuiDescriptionListDescription>
        </Fragment>
      );
      if (arrayIndex % 2 === 0) {
        rows.left.push(cell);
      } else {
        rows.right.push(cell);
      }
    });
    if (ilm.phase_execution) {
      rows.right.push(this.renderPhaseExecutionPopoverButton(ilm));
    }
    return rows;
  }

  render() {
    const {
      index: { ilm },
    } = this.props;
    if (!ilm.managed) {
      return null;
    }
    const { left, right } = this.buildRows();
    return (
      <>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              defaultMessage="Index lifecycle management"
              id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.summaryTitle"
            />
          </h3>
        </EuiTitle>
        {ilm.step_info && ilm.step_info.type ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              color="danger"
              title={
                <FormattedMessage
                  defaultMessage="Index lifecycle error"
                  id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.summaryErrorMessage"
                />
              }
              iconType="cross"
            >
              {ilm.step_info.type}: {ilm.step_info.reason}
            </EuiCallOut>
          </>
        ) : null}
        {ilm.step_info && ilm.step_info!.message ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              color="primary"
              title={
                <FormattedMessage
                  defaultMessage="Action status"
                  id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.actionStatusTitle"
                />
              }
            >
              {ilm.step_info!.message}
            </EuiCallOut>
          </>
        ) : null}
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList type="column">{left}</EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList type="column">{right}</EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
}
