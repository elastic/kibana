import uuid from 'uuid/v4';

export function getId(type) {
  return `${type}-${uuid()}`;
}
