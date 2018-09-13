import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';

export const axisConfig = () => ({
  name: 'axisConfig',
  displayName: 'Axis Config',
  help: 'Visualization axis configuration',
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  template: templateFromReactComponent(ExtendedTemplate),
});
