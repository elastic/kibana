/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPage,
  EuiPageContent,
  EuiTitle,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';

function UpgradeFailureTitle({ titleText }) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiIcon
          size="xl"
          type="alert"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>{titleText}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function UpgradeFailureActions({
  onClose,
  onRetry,
  upgradeButtonText,
}) {
  return (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={onRetry}>
          {upgradeButtonText}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty color="primary" onClick={onClose}>
          Go back
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function UpgradeFailure({
  isNewPipeline,
  isManualUpgrade,
  onClose,
  onRetry,
}) {
  const titleText = isManualUpgrade
    ? 'Upgrade failed'
    : 'Time for an upgrade!';

  const messageText = isNewPipeline
    ? 'Before you can add a pipeline, we need to upgrade your configuration.'
    : 'Before you can edit this pipeline, we need to upgrade your configuration.';

  const upgradeButtonText = isManualUpgrade
    ? 'Try again'
    : 'Upgrade';

  return (
    <EuiPage style={{ minHeight: '100vh' }}>
      <EuiPageContent>
        <EuiEmptyPrompt
          actions={
            <UpgradeFailureActions
              onClose={onClose}
              onRetry={onRetry}
              upgradeButtonText={upgradeButtonText}
            />
          }
          title={
            <UpgradeFailureTitle
              titleText={titleText}
            />
          }
          body={<p style={{ textAlign: 'left' }}>{messageText}</p>}
        />
      </EuiPageContent>
    </EuiPage>
  );
}

const app = uiModules.get('xpack/logstash');

app.directive('upgradeFailure', function ($injector) {
  const $route = $injector.get('$route');
  const kbnUrl = $injector.get('kbnUrl');

  return {
    restrict: 'E',
    link: (scope, el) => {
      const onRetry = () => {
        $route.updateParams({ retry: true });
        $route.reload();
      };
      const onClose = () => { scope.$evalAsync(kbnUrl.change('management/logstash/pipelines', {})); };
      const isNewPipeline = isEmpty(scope.pipeline.id);
      const isManualUpgrade = !!$route.current.params.retry;

      render(
        <UpgradeFailure
          isNewPipeline={isNewPipeline}
          isManualUpgrade={isManualUpgrade}
          onRetry={onRetry}
          onClose={onClose}
        />, el[0]);
    },
    scope: {
      pipeline: '='
    },
  };
});
