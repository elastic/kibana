/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { all } from 'lodash';
import {
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiConfirmModal,
  EuiOverlayMask
} from '@elastic/eui';
import { flattenPanelTree } from '../../../../lib/flatten_panel_tree';
import { INDEX_OPEN } from '../../../../../common/constants';
import { getActionExtensions } from '../../../../index_management_extensions';
import { getHttpClient } from '../../../../services/api';

class IndexActionsContextMenuUi extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      renderConfirmModal: null,
    };
  }
  closeConfirmModal = () => {
    this.setState({
      renderConfirmModal: null
    });
    this.props.resetSelection && this.props.resetSelection();
  }
  panels() {
    const {
      closeIndices,
      openIndices,
      flushIndices,
      refreshIndices,
      clearCacheIndices,
      editIndex,
      showMapping,
      showStats,
      showSettings,
      detailPanel,
      indexNames,
      indexStatusByName,
      performExtensionAction,
      indices,
      intl,
      reloadIndices
    } = this.props;
    const allOpen = all(indexNames, indexName => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });
    const selectedIndexCount = indexNames.length;
    const items = [];
    if (!detailPanel && selectedIndexCount === 1) {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.showIndexSettingsLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Show index settings} other {Show indices settings} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="indexSettings" />,
        onClick: () => {
          this.closePopoverAndExecute(showSettings);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.showIndexMappingLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Show index mapping} other {Show indices mapping} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="indexMapping" />,
        onClick: () => {
          this.closePopoverAndExecute(showMapping);
        }
      });
      if (allOpen) {
        items.push({
          name: intl.formatMessage({
            id: 'xpack.idxMgmt.indexActionsMenu.showIndexStatsLabel',
            defaultMessage: '{selectedIndexCount, plural, one {Show index stats} other {Show indices stats} }',
          }, { selectedIndexCount }),
          icon: <EuiIcon type="stats" />,
          onClick: () => {
            this.closePopoverAndExecute(showStats);
          }
        });
      }
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.editIndexSettingsLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Edit index settings} other {Edit indices settings} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="indexEdit" />,
        onClick: () => {
          this.closePopoverAndExecute(editIndex);
        }
      });
    }
    if (allOpen) {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.closeIndexLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Close index} other {Close indices} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="indexClose" />,
        onClick: () => {
          this.closePopoverAndExecute(closeIndices);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.forceMergeIndexLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Force merge index} other {Force merge indices} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="merge" />,
        onClick: () => {
          this.closePopover();
          this.setState({ renderConfirmModal: this.renderForcemergeSegmentsModal });
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.refreshIndexLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Refresh index} other {Refresh indices} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="refresh" />,
        onClick: () => {
          this.closePopoverAndExecute(refreshIndices);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.clearIndexCacheLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Clear index cache} other {Clear indices cache} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="broom" />,
        onClick: () => {
          this.closePopoverAndExecute(clearCacheIndices);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.flushIndexLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Flush index} other {Flush indices} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="indexFlush" />,
        onClick: () => {
          this.closePopoverAndExecute(flushIndices);
        }
      });
    } else {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.openIndexLabel',
          defaultMessage: '{selectedIndexCount, plural, one {Open index} other {Open indices} }',
        }, { selectedIndexCount }),
        icon: <EuiIcon type="indexOpen" />,
        onClick: () => {
          this.closePopoverAndExecute(openIndices);
        }
      });
    }
    items.push({
      name: intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.deleteIndexLabel',
        defaultMessage: '{selectedIndexCount, plural, one {Delete index} other {Delete indices} }',
      }, { selectedIndexCount }),
      icon: <EuiIcon type="trash" />,
      onClick: () => {
        this.closePopover();
        this.setState({ renderConfirmModal: this.renderConfirmDeleteModal });
      }
    });
    getActionExtensions().forEach((actionExtension) => {
      const actionExtensionDefinition = actionExtension(indices, reloadIndices);
      if (actionExtensionDefinition) {
        const { buttonLabel, requestMethod, successMessage, icon, renderConfirmModal } = actionExtensionDefinition;
        if (requestMethod) {
          items.push({
            name: buttonLabel,
            icon: <EuiIcon type={icon} />,
            onClick: () => {
              this.closePopoverAndExecute(async () => {
                await performExtensionAction(requestMethod, successMessage);
              });
            },
          });
        } else {
          items.push({
            name: buttonLabel,
            icon: <EuiIcon type={icon} />,
            onClick: () => {
              this.closePopover();
              this.setState({ renderConfirmModal });
            }
          });
        }
      }
    });
    items.forEach(item => {
      item['data-test-subj'] = 'indexTableContextMenuButton';
    });
    const panelTree = {
      id: 0,
      title: intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.panelTitle',
        defaultMessage: '{selectedIndexCount, plural, one {Index options} other {Indices options} }',
      }, { selectedIndexCount }),
      items
    };
    return flattenPanelTree(panelTree);
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen
    }));
  };

  closePopoverAndExecute = func => {
    this.setState({
      isPopoverOpen: false,
      renderConfirmModal: false
    });
    func();
    this.props.resetSelection && this.props.resetSelection();
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false
    });
  };

  forcemergeSegmentsError = () => {
    const { forcemergeSegments } = this.state;
    const { intl } = this.props;
    if (!forcemergeSegments || forcemergeSegments.match(/^([1-9][0-9]*)?$/)) {
      return;
    } else {
      return intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.segmentsNumberErrorMessage',
        defaultMessage: 'The number of segments must be greater than zero.',
      });
    }
  };
  renderForcemergeSegmentsModal = () => {
    const { forcemergeIndices, indexNames, intl } = this.props;
    const helpText = intl.formatMessage({
      id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeSegmentsHelpText',
      defaultMessage: 'Merge the segments in an index until the number is reduced to this or fewer segments. The default is 1.',
    });
    const selectedIndexCount = indexNames.length;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={intl.formatMessage({
            id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.modalTitle',
            defaultMessage: 'Force merge',
          })}
          onCancel={this.closeConfirmModal}
          onConfirm={() => {
            if (!this.forcemergeSegmentsError()) {
              this.closePopoverAndExecute(() => {
                forcemergeIndices(this.state.forcemergeSegments);
                this.setState({
                  forcemergeSegments: null,
                  showForcemergeSegmentsModal: null
                });
              });
            }
          }}
          cancelButtonText={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.confirmButtonText',
              defaultMessage: 'Force merge',
            })
          }
        >
          <div>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeDescription"
                defaultMessage="You are about to force merge {selectedIndexCount, plural, one {this index:} other {these indices:}}"
                values={{ selectedIndexCount }}
              />
            </p>
            <ul>
              {indexNames.map(indexName => (
                <li key={indexName}>{indexName}</li>
              ))}
            </ul>
            <EuiCallOut
              title={intl.formatMessage({
                id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.proceedWithCautionCallOutTitle',
                defaultMessage: 'Proceed with caution!',
              })}
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeWarningDescription"
                  defaultMessage="
                    Force merging a large index or an index that is not read-only can
                    potentially cause performance and stability issues in the cluster
                    if it is not run properly (run against non-read-only indices) or run during peak hours.
                  "
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
            <EuiForm
              isInvalid={this.forcemergeSegmentsError()}
              error={this.forcemergeSegmentsError()}
            >
              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.maximumNumberOfSegmentsFormRowLabel',
                  defaultMessage: 'Maximum number of segments per shard',
                })}
                helpText={helpText}
              >
                <EuiFieldText
                  onChange={event => {
                    this.setState({ forcemergeSegments: event.target.value });
                  }}
                  name="maxNumberSegments"
                />
              </EuiFormRow>
            </EuiForm>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  renderConfirmDeleteModal = () => {
    const { deleteIndices, indexNames, intl } = this.props;
    const selectedIndexCount = indexNames.length;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.modalTitle',
              defaultMessage: '{selectedIndexCount, plural, one {Confirm Delete index} other {Confirm Delete indices} }',
            }, { selectedIndexCount })
          }
          onCancel={this.closeConfirmModal}
          onConfirm={() => this.closePopoverAndExecute(deleteIndices)}
          cancelButtonText={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.confirmButtonText',
              defaultMessage: 'Confirm',
            })
          }
        >
          <div>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteDescription"
                defaultMessage="You are about to delete {selectedIndexCount, plural, one {this index:} other {these indices:}}"
                values={{ selectedIndexCount }}
              />
            </p>
            <ul>
              {indexNames.map(indexName => (
                <li key={indexName}>{indexName}</li>
              ))}
            </ul>
            <EuiCallOut
              title={
                intl.formatMessage({
                  id: 'xpack.idxMgmt.indexActionsMenu.deleteIndex.proceedWithCautionCallOutTitle',
                  defaultMessage: 'Proceed with caution!',
                })
              }
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteEntityWarningDescription"
                  defaultMessage="This operation cannot be undone. Make sure you have appropriate backups."
                />
              </p>
            </EuiCallOut>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };
  render() {
    const { indexNames, intl } = this.props;
    const selectedIndexCount = indexNames.length;
    const {
      iconSide = 'right',
      anchorPosition = 'rightUp',
      label = intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.manageButtonLabel',
        defaultMessage: 'Manage {selectedIndexCount, plural, one {index} other {indices}}',
      }, { selectedIndexCount }),
      iconType = 'arrowDown'
    } = this.props;
    const panels = this.panels();
    const button = (
      <EuiButton
        data-test-subj="indexActionsContextMenuButton"
        iconSide={iconSide}
        aria-label={intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.manageButtonAriaLabel',
          defaultMessage: '{selectedIndexCount, plural, one {index options} other {indices options} }',
        }, { selectedIndexCount })}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill
      >
        {label}
      </EuiButton>
    );

    return (
      <div>
        {this.state.renderConfirmModal ? this.state.renderConfirmModal(this.closeConfirmModal, getHttpClient()) : null}
        <EuiPopover
          id={`contextMenu${selectedIndexCount === 1 ? 'index' : 'indices'}`}
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          withTitle
          anchorPosition={anchorPosition}
          repositionOnScroll
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
    );
  }
}

export const IndexActionsContextMenu = injectI18n(IndexActionsContextMenuUi);
