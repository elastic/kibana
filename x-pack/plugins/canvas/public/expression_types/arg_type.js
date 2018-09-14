import { Registry } from '../../common/lib/registry';
import { BaseForm } from './base_form';

export class ArgType extends BaseForm {
  constructor(props) {
    super(props);

    this.simpleTemplate = props.simpleTemplate;
    this.template = props.template;
    this.default = props.default;
    this.resolveArgValue = Boolean(props.resolveArgValue);
  }
}

class ArgTypeRegistry extends Registry {
  wrapper(obj) {
    return new ArgType(obj);
  }
}

export const argTypeRegistry = new ArgTypeRegistry();
