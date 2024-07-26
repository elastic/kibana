import type { Role } from '@kbn/security-plugin-types-common';
import type { Space } from '../../../common';

export const filterRolesAssignedToSpace = (roles: Role[], space: Space) => {
  return roles.filter((role) =>
    role.kibana.reduce((acc, cur) => {
      return (
        (cur.spaces.includes(space.name) || cur.spaces.includes('*')) &&
        Boolean(cur.base.length) &&
        acc
      );
    }, true)
  );
};
