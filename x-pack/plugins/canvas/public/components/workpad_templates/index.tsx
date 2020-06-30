/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, useEffect, FunctionComponent } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { RouterContext } from '../router';
import { ComponentStrings } from '../../../i18n/components';
// @ts-expect-error
import * as workpadService from '../../lib/workpad_service';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { WorkpadTemplates as Component } from './workpad_templates';
import { CanvasTemplate } from '../../../types';
import { UseKibanaProps } from '../../';
import { list } from '../../lib/template_service';
import { applyTemplateStrings } from '../../../i18n/templates/apply_strings';

interface WorkpadTemplatesProps {
  onClose: () => void;
}

const Creating: FunctionComponent<{ name: string }> = ({ name }) => (
  <div>
    <EuiLoadingSpinner size="l" />{' '}
    {ComponentStrings.WorkpadTemplates.getCreatingTemplateLabel(name)}
  </div>
);
export const WorkpadTemplates: FunctionComponent<WorkpadTemplatesProps> = ({ onClose }) => {
  const router = useContext(RouterContext);
  const [templates, setTemplates] = useState<CanvasTemplate[] | undefined>(undefined);
  const [creatingFromTemplateName, setCreatingFromTemplateName] = useState<string | undefined>(
    undefined
  );
  const kibana = useKibana<UseKibanaProps>();

  useEffect(() => {
    if (!templates) {
      (async () => {
        const fetchedTemplates = await list();
        setTemplates(applyTemplateStrings(fetchedTemplates));
      })();
    }
  }, [templates]);

  let templateProp: Record<string, CanvasTemplate> = {};

  if (templates) {
    templateProp = templates.reduce<Record<string, any>>((reduction, template) => {
      reduction[template.name] = template;
      return reduction;
    }, {});
  }

  const createFromTemplate = async (template: CanvasTemplate) => {
    setCreatingFromTemplateName(template.name);
    try {
      const result = await workpadService.createFromTemplate(template.id);
      if (router) {
        router.navigateTo('loadWorkpad', { id: result.data.id, page: 1 });
      }
    } catch (error) {
      setCreatingFromTemplateName(undefined);
      kibana.services.canvas.notify.error(error, {
        title: `Couldn't create workpad from template`,
      });
    }
  };

  if (creatingFromTemplateName) {
    return <Creating name={creatingFromTemplateName} />;
  }

  return (
    <Component
      onClose={onClose}
      templates={templateProp}
      onCreateFromTemplate={createFromTemplate}
    />
  );
};
