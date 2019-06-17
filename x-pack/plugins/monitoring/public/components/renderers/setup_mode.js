/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { setAngularState, getSetupModeState, initSetupModeState, updateSetupModeData } from '../../lib/setup_mode';
import { Flyout } from '../metricbeat_migration/flyout';
import { ELASTICSEARCH_CUSTOM_ID } from '../../../common/constants';

export class SetupModeRenderer extends React.Component {
  state = {
    renderState: false,
    isFlyoutOpen: false,
    instance: null,
  }

  componentWillMount() {
    const { scope, injector } = this.props;
    setAngularState(scope, injector);
    initSetupModeState(() => this.setState({ renderState: true }));
  }

  getFlyout(data, meta) {
    const { productName } = this.props;
    const { isFlyoutOpen, instance } = this.state;
    if (!data || !isFlyoutOpen) {
      return null;
    }

    let product = instance ? data.byUuid[instance.uuid] : null;
    const isFullyOrPartiallyMigrated = data.totalUniquePartiallyMigratedCount === data.totalUniqueInstanceCount
      || data.totalUniqueFullyMigratedCount === data.totalUniqueInstanceCount;
    if (!product && productName === ELASTICSEARCH_CUSTOM_ID && isFullyOrPartiallyMigrated) {
      product = Object.values(data.byUuid)[0];
    }

    return (
      <Flyout
        onClose={() => this.setState({ isFlyoutOpen: false })}
        productName={productName}
        product={product}
        meta={meta}
        instance={instance}
        updateProduct={updateSetupModeData}
      />
    );
  }

  render() {
    const { render, productName } = this.props;
    const setupModeState = getSetupModeState();
    const data = setupModeState.data ? setupModeState.data[productName] : null;
    const meta = setupModeState.data ? setupModeState.data._meta : null;

    return render({
      setupMode: {
        data,
        enabled: setupModeState.enabled,
        productName,
        updateSetupModeData,
        openFlyout: (instance) => this.setState({ isFlyoutOpen: true, instance }),
        closeFlyout: () => this.setState({ isFlyoutOpen: false }),
      },
      flyoutComponent: this.getFlyout(data, meta),
    });
  }
}
