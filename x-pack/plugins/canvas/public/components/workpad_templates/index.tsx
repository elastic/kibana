/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, useEffect } from 'react';
import { RouterContext } from '../router';
// @ts-ignore Untyped Local
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

export const WorkpadTemplates: React.FunctionComponent<WorkpadTemplatesProps> = ({ onClose }) => {
  const router = useContext(RouterContext);
  const [templates, setTemplates] = useState<CanvasTemplate[] | undefined>(undefined);
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
    try {
      const result = await workpadService.createFromTemplate(template.id);
      if (router) {
        router.navigateTo('loadWorkpad', { id: result.data.id, page: 1 });
      }
    } catch (error) {
      kibana.services.canvas.notify.error(error, {
        title: `Couldn't create workpad from template`,
      });
    }
  };

  return (
    <Component
      onClose={onClose}
      templates={templateProp}
      onCreateFromTemplate={createFromTemplate}
    />
  );
};
