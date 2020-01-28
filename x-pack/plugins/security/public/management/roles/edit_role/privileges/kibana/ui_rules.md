# Kibana Privileges

Are insanely complex. Sorry. Here are the rules which govern the behavior of the various controls:

## Privilege Space Table "Privilege" column

The record will display `Custom` when **all** of the following are true:
- There are effective feature privileges which are not superseded by any effective base privilege

If the requirements for `Custom` are not met, then the most-permissive effective base privilege shall be displayed.

-------------------------------------------------------

## Base privilege drop-down
### Visibility
This control is always visible.

### Enabled
Each option within the drop-down is enabled when **all** of the following are true:
- The privilege associated with this option is not superseded by a privilege outside of this group. More concretely, `global-all` will prevent `space-read` from being selected.

### Selected
Each option in the group is selected when **all** of the following are true:
- The privilege associated with the control is granted (directly, or via inherited privileges).
- The privilege is not superseded by another privilege within this group.

The `Custom` option within the group is selected when **all** of the following are true:
- There are no granted base privileges

-------------------------------------------------------

## Primary Feature Privilege Button Group
### Visibility
This control is always visible for features with privileges defined.

### Enabled
Each option within the group is enabled when **all** of the following are true:
- There is no base privilege directly assigned
- There is not a more-permissive privilege within the group which is granted by an inherited privilege.
- The privilege associated with this option is not superseded by a privilege outside of this group.

The `None` button within the group is enabled when **all** of the following are true:
- There are no privileges within this mutually-exclusive group which are inherited by a privilege outside of this mutually-exclusive group.

### Selected
Each button within the group is selected when **all** of the following are true:
- The privilege associated with the control is granted (directly, or via inherited privileges).
- The privilege is not superseded by another privilege within this mutually-exclusive group. It is assumed that the permissions within the group are defined in the most permissive -> least permissive order. (Descending by permissiveness).

The `None` button within the group is selected when **all** of the following are true:
- None of the privileges within the group have been granted.

-------------------------------------------------------

## Customize Sub-Feature Privileges Checkbox

### Visibility
This control is visible when **all** of the following are true:
- The Feature has 1 or more sub-features
- The Feature's row within the <FeatureTable /> is expanded

If the control is **not** visible, then the Enabled and Checked sections do not apply.

### Enabled
This control is enabled when **all** of the following are true:
- The Role is editable
- There is NOT an effective base privilege directly assigned
- **Any** of the folowing are true
  - There is a directly assigned primary feature privilege which is not superseded
  - There is an inherited primary feature privilege, **and** this privilege does not grant access to all available sub-features, **and** and there are not inherited sub-features

### Checked
This control is checked when **any** of the following are true:
- The feature has effective sub-feature privileges which are not superseded by any primary feature privileges or base privileges
- The feature has an effective minimum primary feature privilege which is not superseded

### Behaviors
If unchecking:
- If effective minimal primary feature privilege is directly assigned, replace with non-minimal version
- If effective minimal primary feature privilege is inherited, then directly assign the non-minimal version
If checking:
- If effective non-minimal primary feature privilege is directly assigned, replace with the minimal version
- If effective non-minimal primary feature privilege is inherited, ????????

-------------------------------------------------------

## Independent Sub-Feature Privilege Checkbox

### Visibility
This control is visible when **all** of the following are true:
- The Feature's row within the <FeatureTable /> is expanded

If the control is **not** visible, then the Enabled and Checked sections do not apply.

### Enabled
This control is enabled when **all** of the following are true:
- The "Customize Sub-Feature Privileges Checkbox" is checked.
- The privilege associated with this control is not inherited.


### Checked
This control is checked when **all** of the following are true:
- The privilege associated with the control is granted (directly or via inherited privileges).

-------------------------------------------------------

## Mutually-Exclusive Sub-Feature Button Group

### Visibility
This control is visible when **all** of the following are true:
- The Feature's row within the <FeatureTable /> is expanded

If the control is **not** visible, then the Enabled and Selected sections do not apply.

### Enabled
Each button within the group is enabled when **all** of the following are true:
- The "Customize Sub-Feature Privileges Checkbox" is checked.
- There is not a more-permissive privilege within the group which is granted by an inherited privilege.

The `None` button within the group is enabled when **all** of the following are true:
- The "Customize Sub-Feature Privileges Checkbox" is checked.
- There are no privileges within this mutually-exclusive group which are inherited by a privilege outside of this mutually-exclusive group.


### Selected
Each button within the group is selected when **all** of the following are true:
- The privilege associated with the control is granted (directly, or via inherited privileges).
- The privilege is not superseded by another privilege within this mutually-exclusive group. It is assumed that the permissions within the group are defined in the most permissive -> least permissive order. (Descending by permissiveness).

The `None` button within the group is selected when **all** of the following are true:
- None of the privileges within the group have been granted.

