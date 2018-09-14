import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

export class Transform extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }
}

class TransformRegistry extends Registry {
  wrapper(obj) {
    return new Transform(obj);
  }
}

export const transformRegistry = new TransformRegistry();
