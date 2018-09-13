import toPath from 'lodash.topath';

export function prepend(path, value) {
  return toPath(value).concat(toPath(path));
}

export function append(path, value) {
  return toPath(path).concat(toPath(value));
}

export function convert(path) {
  return toPath(path);
}
