import { htmlIdGenerator } from '@elastic/eui';
import { ECSFIELDS } from '@Constants/ecsFields';

function isEmptyValue(value): boolean {
  return value === null || value === '';
}

function getExampleValueByPath(obj: object, path: string): object {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function mergeDeeply(objects: object[], base?: object): object {
  const result: object = base ?? {};

  const merge = (target: object, source: object): object => {
    Object.keys(source).forEach((key) => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
        if (typeof targetValue !== 'object' || targetValue === null || isEmptyValue(targetValue)) {
          target[key] = merge({}, sourceValue);
        } else {
          target[key] = merge(targetValue, sourceValue);
        }
      } else if (
        !Object.prototype.hasOwnProperty.call(target, key) ||
        (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))
      ) {
        target[key] = sourceValue;
      }
    });

    return target;
  };

  objects.forEach((obj) => {
    merge(result, obj);
  });

  return result;
}

export function traverseAndMatchFields(
  mapping: object,
  mergedObject: object,
  packageName: string,
  dataStreamName: string,
  path: string[] = [],
): EcsMappingTableItem[] {
  const makeId = htmlIdGenerator();
  let matches: EcsMappingTableItem[] = [];

  Object.entries(mapping).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      matches = matches.concat(
        traverseAndMatchFields(value, mergedObject, packageName, dataStreamName, path.concat(key)),
      );
    } else {
      const matchKey = value;
      const isECS = ECSFIELDS.hasOwnProperty(matchKey); // eslint-disable-line no-prototype-builtins
      const fullPath = path.concat(key).join('.');
      const exampleValue = getExampleValueByPath(mergedObject, fullPath);
      const destinationField = isECS ? matchKey : `${packageName}.${dataStreamName}.${fullPath}`;

      matches.push({
        sourceField: fullPath,
        destinationField: destinationField,
        isEcs: isECS,
        description: isECS ? ECSFIELDS[matchKey] : '',
        id: makeId(),
        exampleValue: exampleValue,
      });
    }
  });

  return matches;
}
