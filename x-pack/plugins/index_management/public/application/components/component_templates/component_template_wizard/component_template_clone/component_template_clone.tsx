/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SectionLoading } from '../../shared_imports';
import { useComponentTemplatesContext } from '../../component_templates_context';
import { attemptToDecodeURI } from '../../lib';
import { ComponentTemplateCreate } from '../component_template_create';

export interface Params {
  sourceComponentTemplateName: string;
}

export const ComponentTemplateClone: FunctionComponent<RouteComponentProps<Params>> = (props) => {
  const { sourceComponentTemplateName } = props.match.params;
  const decodedSourceName = attemptToDecodeURI(sourceComponentTemplateName);

  const { toasts, api } = useComponentTemplatesContext();

  const { error, data: componentTemplateToClone, isLoading } = api.useLoadComponentTemplate(
    decodedSourceName
  );

  useEffect(() => {
    if (error && !isLoading) {
      toasts.addError(error, {
        title: i18n.translate('xpack.idxMgmt.componentTemplateClone.loadComponentTemplateTitle', {
          defaultMessage: `Error loading component template '{sourceComponentTemplateName}'.`,
          values: { sourceComponentTemplateName },
        }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isLoading]);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateEdit.loadingDescription"
          defaultMessage="Loading component template…"
        />
      </SectionLoading>
    );
  } else {
    // We still show the create form (unpopulated) even if we were not able to load the
    // selected component template data.
    const sourceComponentTemplate = componentTemplateToClone
      ? { ...componentTemplateToClone, name: `${componentTemplateToClone.name}-copy` }
      : undefined;

    return <ComponentTemplateCreate {...props} sourceComponentTemplate={sourceComponentTemplate} />;
  }
};
