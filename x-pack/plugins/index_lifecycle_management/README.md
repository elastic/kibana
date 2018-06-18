# Index lifecyle management

## What is it
-- TODO --

## UI

The UI currently consists of a single wizard, broken into three steps.

### Step 1
The first step involves choosing the index template in which the created/selected policy will be applied.
Then, it lets the user tweak configuration options on this template including shard and replica count as well as allocation rules.

### Step 2
The second step lets the user choose which policy they want to apply to the selected index template. They can choose a new one or select an existing one. Either way, after selection, they will see configuration options for the policy itself. This includes configuration for the hot, warm, cold, and delete phase.

### Step 3
The third and last step lets the user name their policy and also see the affected indices and index templates. These indices and index templates are what will be affected once the user saves the work done in the wizard (This includes changes to the index template itself which will change indices created from the template and also changes to a policy that is attached to another index template). The user can also see a visual diff of what will change in the index template. Then, the user clicks the Save button and blamo!

## UI Architecture

The UI is built on React and Redux.

### Redux

The redux store consists of a few top level attributes:
```
indexTemplate
nodes
policies
general
```

The logic behind the store is separate into four main concerns:
1) reducers/
2) actions/
3) selectors/
4) middleware/

The reducers and actions are pretty standard redux, so no need to discuss much there.

### Selectors

The selectors showcase how we access any stateful data. All access comes through selectors so if there are any changes required to the state tree, we only need to update the reducers and selectors.

#### Middleware

The middleware folder contains specific pieces of state logic we need to handle side effects of certain state changing.

One example is the `auto_enable_phase.js` middleware. By default, the warm, cold and delete phases are disabled. However, the user can expand the section in the UI and edit configuration without needing to enable/disable the phase. Ideally, once the user edits any configuration piece within a phase, we _assume_ they want that phase enabled so this middleware will detect a change in a phase and enable if it is not enabled already.

#### Generic phase data

Each of our four phases have some similar and some unique configuration options. Instead of making each individual phase a specific action for that phase, the code is written more generically to capture any data change within a phase to a single action. Therefore, each phase component's configuration inputs will look similar, like: `setPhaseData(PHASE_ROLLOVER_AFTER_UNITS, e.target.value)`. The top level container for each phase will handle automatically prefixing the `setPhaseData` prop with the right phase: ` setPhaseData: (key, value) => setPhaseData(PHASE_COLD, key, value),`.

To complement this generic logic, there is a list of constants that are used to ensure the right pieces of data are changed. These are contained within `store/constants.js`

### Diff View

The third step of the wizard features a visual diff UI component which is custom to this feature. It is based off Ace/Brace and the custom code used to power is it lives in `lib/diff_ace_addons.js` and `lib/diff_tools.js`. The UI parts are in `sections/wizard/components/review/diff_view.js`. See those individual files for more detailed comments/explanations.

### Validation

Every step in the wizard features validation and will show error states after the user attempts to move to the next step assuming there are errors on the current page.

This works by constantly revalidating the entire wizard state after each state change. This is technically optional as the method to trigger validation is manually called in each UI component that triggers a state change.

It's important to note that the validation logic does not apply to a single step in the wizard, but will always validate the entire state tree. This helps prevent scenarios where a change in a step might invalidate a change in another step and we lose that validation state.

Once a step change is initiated (like clicking Next Step), the current step is marked as able to see errors and will reject the change if there are errors. It will show a toast to the user that there are errors and make each error visible on the relevant UI control.

As a way to consolidate showing these errors, there is a custom UI component called `ErrableFormRow` that wraps a `EuiFormRow` and it's child with the appropriate error states when appropriate.
