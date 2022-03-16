/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import {
  EuiFormRow,
  EuiButton,
  EuiButtonEmpty,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiSuperDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Embeddable, IContainer, ContainerInput } from '../../../../src/plugins/embeddable/public';
import { TimeRange } from '../../../../src/plugins/data/public';
import { TimeRangeInput } from './custom_time_range_action';
import { doesInheritTimeRange } from './does_inherit_time_range';
import { CommonlyUsedRange } from './types';

interface CustomizeTimeRangeProps {
  embeddable: Embeddable<TimeRangeInput>;
  onClose: () => void;
  dateFormat?: string;
  commonlyUsedRanges: CommonlyUsedRange[];
}

interface State {
  timeRange?: TimeRange;
  inheritTimeRange: boolean;
}

export class CustomizeTimeRangeModal extends Component<CustomizeTimeRangeProps, State> {
  constructor(props: CustomizeTimeRangeProps) {
    super(props);
    this.state = {
      timeRange: props.embeddable.getInput().timeRange,
      inheritTimeRange: doesInheritTimeRange(props.embeddable),
    };
  }

  onTimeChange = ({ start, end }: { start: string; end: string }) => {
    this.setState({ timeRange: { from: start, to: end } });
  };

  cancel = () => {
    this.props.onClose();
  };

  onInheritToggle = () => {
    this.setState((prevState) => ({
      inheritTimeRange: !prevState.inheritTimeRange,
    }));
  };

  addToPanel = () => {
    const { embeddable } = this.props;

    embeddable.updateInput({ timeRange: this.state.timeRange });

    this.props.onClose();
  };

  inheritFromParent = () => {
    const { embeddable } = this.props;
    const parent = embeddable.parent as IContainer<{}, ContainerInput<TimeRangeInput>>;
    const parentPanels = parent!.getInput().panels;

    // Remove explicit input to this child from the parent.
    parent!.updateInput({
      panels: {
        ...parentPanels,
        [embeddable.id]: {
          ...parentPanels[embeddable.id],
          explicitInput: {
            ...parentPanels[embeddable.id].explicitInput,
            timeRange: undefined,
          },
        },
      },
    });

    this.props.onClose();
  };

  public render() {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj="customizePanelTitle">
            {i18n.translate('xpack.uiActionsEnhanced.customizeTimeRange.modal.headerTitle', {
              defaultMessage: 'Customize panel time range',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj="customizePanelBody">
          <EuiFormRow
            label={i18n.translate(
              'xpack.uiActionsEnhanced.customizePanelTimeRange.modal.optionsMenuForm.panelTitleFormRowLabel',
              {
                defaultMessage: 'Time range',
              }
            )}
          >
            <EuiSuperDatePicker
              start={this.state.timeRange ? this.state.timeRange.from : undefined}
              end={this.state.timeRange ? this.state.timeRange.to : undefined}
              onTimeChange={this.onTimeChange}
              showUpdateButton={false}
              dateFormat={this.props.dateFormat}
              commonlyUsedRanges={this.props.commonlyUsedRanges.map(
                ({ from, to, display }: { from: string; to: string; display: string }) => {
                  return {
                    start: from,
                    end: to,
                    label: display,
                  };
                }
              )}
              data-test-subj="customizePanelTimeRangeDatePicker"
            />
          </EuiFormRow>
        </EuiModalBody>
        <EuiModalFooter data-test-subj="customizePanelFooter">
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={true}>
              <div>
                <EuiButtonEmpty
                  onClick={this.inheritFromParent}
                  color="danger"
                  data-test-subj="removePerPanelTimeRangeButton"
                  disabled={!this.props.embeddable.parent || this.state.inheritTimeRange}
                  flush="left"
                >
                  {i18n.translate(
                    'xpack.uiActionsEnhanced.customizePanelTimeRange.modal.removeButtonTitle',
                    {
                      defaultMessage: 'Remove',
                    }
                  )}
                </EuiButtonEmpty>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={this.cancel} data-test-subj="cancelPerPanelTimeRangeButton">
                {i18n.translate(
                  'xpack.uiActionsEnhanced.customizePanelTimeRange.modal.cancelButtonTitle',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="addPerPanelTimeRangeButton" onClick={this.addToPanel} fill>
                {this.state.inheritTimeRange
                  ? i18n.translate(
                      'xpack.uiActionsEnhanced.customizePanelTimeRange.modal.addToPanelButtonTitle',
                      {
                        defaultMessage: 'Add to panel',
                      }
                    )
                  : i18n.translate(
                      'xpack.uiActionsEnhanced.customizePanelTimeRange.modal.updatePanelTimeRangeButtonTitle',
                      {
                        defaultMessage: 'Update',
                      }
                    )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </React.Fragment>
    );
  }
}
