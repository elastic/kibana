/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { ReindexWarning } from '../../../../../../../common/types';

export const idForWarning = (warning: ReindexWarning) => `reindexWarning-${warning}`;

interface WarningsConfirmationFlyoutProps {
  closeFlyout: () => void;
  warnings: ReindexWarning[];
  advanceNextStep: () => void;
}

interface WarningsConfirmationFlyoutState {
  checkedIds: { [id: string]: boolean };
}

export class WarningsFlyoutStep extends React.Component<
  WarningsConfirmationFlyoutProps,
  WarningsConfirmationFlyoutState
> {
  constructor(props: WarningsConfirmationFlyoutProps) {
    super(props);

    this.state = {
      checkedIds: props.warnings.reduce(
        (checkedIds, warning) => {
          checkedIds[idForWarning(warning)] = false;
          return checkedIds;
        },
        {} as { [id: string]: boolean }
      ),
    };
  }

  public render() {
    const { warnings, closeFlyout, advanceNextStep } = this.props;
    const { checkedIds } = this.state;

    // Do not allow to proceed until all checkboxes are checked.
    const blockAdvance = Object.values(checkedIds).filter(v => v).length < warnings.length;

    return (
      <Fragment>
        <EuiFlyoutBody>
          <EuiCallOut
            title="This index required destructive changes"
            color="danger"
            iconType="alert"
          >
            <p>
              <strong>This cannot be undone.</strong> It is highly advised you backup this index
              before proceeding.
            </p>
            <p>
              To proceed with the reindex, you must accept each breaking change by checking the box
              next to it.
            </p>
          </EuiCallOut>

          <EuiSpacer />

          {warnings.includes(ReindexWarning.allField) && (
            <EuiCheckbox
              id={idForWarning(ReindexWarning.allField)}
              label={
                <EuiText>
                  <h4>_all field will be removed</h4>
                  <p>
                    The <code>_all</code> meta field is no longer supported in 7.0 and reindexing
                    will remove this field in the new index. Ensure that you have no application
                    code or scripts relying on this field to exist before reindexing.
                  </p>
                  <EuiLink
                    href="https://www.elastic.co/guide/en/elasticsearch/reference/6.0/breaking_60_mappings_changes.html#_the_literal__all_literal_meta_field_is_now_disabled_by_default"
                    target="_blank"
                  >
                    Documentation
                  </EuiLink>
                </EuiText>
              }
              checked={checkedIds[idForWarning(ReindexWarning.allField)]}
              onChange={this.onChange}
            />
          )}

          <EuiSpacer />

          {warnings.includes(ReindexWarning.booleanFields) && (
            <EuiCheckbox
              id={idForWarning(ReindexWarning.booleanFields)}
              label={
                <EuiText>
                  <h4>Boolean data in _source may change</h4>
                  <p>
                    If any documents contain any boolean fields that are not <code>true</code> or{' '}
                    <code>false</code> (eg. <code>"yes"</code>, <code>"on"</code>, <code>1</code>),
                    reindexing will convert these fields in the <em>source document</em> to be{' '}
                    <code>true</code> or <code>false</code>. Ensure that you have no application
                    code or scripts relying on boolean fields in the deprecated format before
                    reindexing.
                  </p>
                  <EuiLink
                    href="https://www.elastic.co/guide/en/elasticsearch/reference/6.0/breaking_60_mappings_changes.html#_coercion_of_boolean_fields"
                    target="_blank"
                  >
                    Documentation
                  </EuiLink>
                </EuiText>
              }
              checked={checkedIds[idForWarning(ReindexWarning.booleanFields)]}
              onChange={this.onChange}
            />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill color="danger" onClick={advanceNextStep} disabled={blockAdvance}>
                Continue reindex
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    );
  }

  private onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;
    const nextCheckedIds = {
      ...this.state.checkedIds,
      ...{
        [optionId]: !this.state.checkedIds[optionId],
      },
    };

    this.setState({ checkedIds: nextCheckedIds });
  };
}
