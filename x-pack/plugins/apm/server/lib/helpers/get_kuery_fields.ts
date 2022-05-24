import { KueryNode } from '@kbn/es-query';
import { compact } from 'lodash';

export function getKueryFields(nodes: KueryNode[]): string[] {
  const allFields = nodes.map((node) => {
    const {
      arguments: [fieldNameArg],
    } = node;

    if (fieldNameArg.type === 'function') {
      return getKueryFields(node.arguments);
    }

    return fieldNameArg.value;
  }).flat();


  return compact(allFields);
}
