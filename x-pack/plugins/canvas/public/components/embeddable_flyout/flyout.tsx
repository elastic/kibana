/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import {
  SavedObjectFinderUi,
  SavedObjectMetaData,
} from '../../../../../../src/plugins/saved_objects/public/';
import { ComponentStrings } from '../../../i18n';
import { CoreStart } from '../../../../../../src/core/public';
import { CanvasStartDeps } from '../../plugin';

const { AddEmbeddableFlyout: strings } = ComponentStrings;

export interface Props {
  onClose: () => void;
  onSelect: (id: string, embeddableType: string) => void;
  availableEmbeddables: string[];
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
  getEmbeddableFactories: CanvasStartDeps['embeddable']['getEmbeddableFactories'];
}

export class AddEmbeddableFlyout extends React.Component<Props> {
  onAddPanel = (id: string, savedObjectType: string, name: string) => {
    const embeddableFactories = this.props.getEmbeddableFactories();

    // Find the embeddable type from the saved object type
    const found = Array.from(embeddableFactories).find((embeddableFactory) => {
      return Boolean(
        embeddableFactory.savedObjectMetaData &&
          embeddableFactory.savedObjectMetaData.type === savedObjectType
      );
    });

    const foundEmbeddableType = found ? found.type : 'unknown';

    this.props.onSelect(id, foundEmbeddableType);
  };

  render() {
    const embeddableFactories = this.props.getEmbeddableFactories();

    const availableSavedObjects = Array.from(embeddableFactories)
      .filter((factory) => {
        return this.props.availableEmbeddables.includes(factory.type);
      })
      .map((factory) => factory.savedObjectMetaData)
      .filter<SavedObjectMetaData<{}>>(function (
        maybeSavedObjectMetaData
      ): maybeSavedObjectMetaData is SavedObjectMetaData<{}> {
        return maybeSavedObjectMetaData !== undefined;
      });

    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{strings.getTitleText()}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SavedObjectFinderUi
            onChoose={this.onAddPanel}
            savedObjectMetaData={availableSavedObjects}
            showFilter={true}
            noItemsMessage={strings.getNoItemsText()}
            savedObjects={this.props.savedObjects}
            uiSettings={this.props.uiSettings}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}
