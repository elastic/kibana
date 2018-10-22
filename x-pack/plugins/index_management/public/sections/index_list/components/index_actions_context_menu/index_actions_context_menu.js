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

class IndexActionsContextMenuUi extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      showDeleteConfirmation: false
    };
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
      intl
    } = this.props;
    const allOpen = all(indexNames, indexName => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });
    const oneIndexSelected = this.oneIndexSelected();
    const entity = this.getEntity(oneIndexSelected);
    const entityUpper = `${entity[0].toUpperCase()}${entity.slice(1)}`;
    const items = [];
    if (!detailPanel && oneIndexSelected) {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.showEntitySettingsLabel',
          defaultMessage: 'Show {entity} settings',
        }, { entity }),
        icon: <EuiIcon type="indexSettings" />,
        onClick: () => {
          this.closePopoverAndExecute(showSettings);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.showEntityMappingLabel',
          defaultMessage: 'Show {entity} mapping',
        }, { entity }),
        icon: <EuiIcon type="indexMapping" />,
        onClick: () => {
          this.closePopoverAndExecute(showMapping);
        }
      });
      if (allOpen) {
        items.push({
          name: intl.formatMessage({
            id: 'xpack.idxMgmt.indexActionsMenu.showEntityStatsLabel',
            defaultMessage: 'Show {entity} stats',
          }, { entity }),
          icon: <EuiIcon type="stats" />,
          onClick: () => {
            this.closePopoverAndExecute(showStats);
          }
        });
      }
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.editEntitySettingsLabel',
          defaultMessage: 'Edit {entity} settings',
        }, { entity }),
        icon: <EuiIcon type="indexEdit" />,
        onClick: () => {
          this.closePopoverAndExecute(editIndex);
        }
      });
    }
    if (allOpen) {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.closeEntityLabel',
          defaultMessage: 'Close {entity}',
        }, { entity }),
        icon: <EuiIcon type="indexClose" />,
        onClick: () => {
          this.closePopoverAndExecute(closeIndices);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.forceMergeEntityLabel',
          defaultMessage: 'Force merge {entity}',
        }, { entity }),
        icon: <EuiIcon type="merge" />,
        onClick: () => {
          this.closePopover();
          this.openForcemergeSegmentsModal();
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.refreshEntityLabel',
          defaultMessage: 'Refresh {entity}',
        }, { entity }),
        icon: <EuiIcon type="refresh" />,
        onClick: () => {
          this.closePopoverAndExecute(refreshIndices);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.clearEntityCacheLabel',
          defaultMessage: 'Clear {entity} cache',
        }, { entity }),
        icon: <EuiIcon type="broom" />,
        onClick: () => {
          this.closePopoverAndExecute(clearCacheIndices);
        }
      });
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.flushEntityLabel',
          defaultMessage: 'Flush {entity}',
        }, { entity }),
        icon: <EuiIcon type="indexFlush" />,
        onClick: () => {
          this.closePopoverAndExecute(flushIndices);
        }
      });
    } else {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.idxMgmt.indexActionsMenu.openEntityLabel',
          defaultMessage: 'Open {entity}',
        }, { entity }),
        icon: <EuiIcon type="indexOpen" />,
        onClick: () => {
          this.closePopoverAndExecute(openIndices);
        }
      });
    }
    items.push({
      name: intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.deleteEntityLabel',
        defaultMessage: 'Delete {entity}',
      }, { entity }),
      icon: <EuiIcon type="trash" />,
      onClick: () => {
        this.closePopover();
        this.openDeleteConfirmationModal();
      }
    });
    items.forEach(item => {
      item['data-test-subj'] = 'indexTableContextMenuButton';
    });
    const panelTree = {
      id: 0,
      title: intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.panelTitle',
        defaultMessage: '{entityUpper} options',
      }, { entityUpper }),
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
      showDeleteConfirmation: false
    });
    func();
    this.props.resetSelection && this.props.resetSelection();
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false
    });
  };

  closeDeleteConfirmationModal = () => {
    this.setState({ showDeleteConfirmation: false });
  };

  openDeleteConfirmationModal = () => {
    this.setState({ showDeleteConfirmation: true });
  };

  openForcemergeSegmentsModal = () => {
    this.setState({ showForcemergeSegmentsModal: true });
  };

  closeForcemergeSegmentsModal = () => {
    this.setState({ showForcemergeSegmentsModal: false });
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
  forcemergeSegmentsModal = () => {
    const { forcemergeIndices, indexNames, intl } = this.props;
    const helpText = intl.formatMessage({
      id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeSegmentsHelpText',
      defaultMessage: 'Merge the segments in an index until the number is reduced to this or fewer segments. The default is 1.',
    });
    const oneIndexSelected = this.oneIndexSelected();
    const entity = this.getEntity(oneIndexSelected);
    const { showForcemergeSegmentsModal } = this.state;
    if (!showForcemergeSegmentsModal) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={intl.formatMessage({
            id: 'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.modalTitle',
            defaultMessage: 'Force merge',
          })}
          onCancel={this.closeForcemergeSegmentsModal}
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
                defaultMessage="You are about to force merge {oneIndexSelected, plural, one {this} other {these}}"
                values={{ oneIndexSelected: oneIndexSelected ? 1 : 0 }}
              />
              {' '}
              {entity}:
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

  confirmDeleteModal = () => {
    const oneIndexSelected = this.oneIndexSelected();
    const entity = this.getEntity(oneIndexSelected);
    const { deleteIndices, indexNames, intl } = this.props;
    const { showDeleteConfirmation } = this.state;
    if (!showDeleteConfirmation) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.deleteEntity.confirmModal.modalTitle',
              defaultMessage: 'Confirm Delete {entity}',
            }, { entity })
          }
          onCancel={this.closeDeleteConfirmationModal}
          onConfirm={() => this.closePopoverAndExecute(deleteIndices)}
          cancelButtonText={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.deleteEntity.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.idxMgmt.indexActionsMenu.deleteEntity.confirmModal.confirmButtonText',
              defaultMessage: 'Confirm',
            })
          }
        >
          <div>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.deleteEntity.deleteDescription"
                defaultMessage="You are about to delete  {oneIndexSelected, plural, one {this} other {these}}"
                values={{ oneIndexSelected: oneIndexSelected ? 1 : 0 }}
              />
              {' '}
              {entity}:
            </p>
            <ul>
              {indexNames.map(indexName => (
                <li key={indexName}>{indexName}</li>
              ))}
            </ul>
            <EuiCallOut
              title={
                intl.formatMessage({
                  id: 'xpack.idxMgmt.indexActionsMenu.deleteEntity.proceedWithCautionCallOutTitle',
                  defaultMessage: 'Proceed with caution!',
                })
              }
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.deleteEntity.deleteEntityWarningDescription"
                  defaultMessage="
                    This operation cannot be undone. Make sure you have appropriate
                    backups.
                  "
                />
              </p>
            </EuiCallOut>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };
  oneIndexSelected = () => {
    return this.props.indexNames.length === 1;
  };
  getEntity = oneIndexSelected => {
    return oneIndexSelected ? 'index' : 'indices';
  };
  render() {
    const { intl } = this.props;
    const indexNamesLength = this.props.indexNames.length;
    const {
      iconSide = 'right',
      anchorPosition = 'rightUp',
      label = intl.formatMessage({
        id: 'xpack.idxMgmt.indexActionsMenu.manageButtonLabel',
        defaultMessage: 'Manage {indexNamesLength, plural, one {index} other {indices}}',
      }, { indexNamesLength }),
      iconType = 'arrowDown'
    } = this.props;
    const panels = this.panels();
    const oneIndexSelected = this.oneIndexSelected();
    const entity = this.getEntity(oneIndexSelected);
    const button = (
      <EuiButton
        data-test-subj="indexActionsContextMenuButton"
        iconSide={iconSide}
        aria-label={`${entity} options`}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill
      >
        {label}
      </EuiButton>
    );

    return (
      <div>
        {this.confirmDeleteModal()}
        {this.forcemergeSegmentsModal()}
        <EuiPopover
          id={`contextMenu${entity}`}
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          withTitle
          anchorPosition={anchorPosition}
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
    );
  }
}

export const IndexActionsContextMenu = injectI18n(IndexActionsContextMenuUi);
