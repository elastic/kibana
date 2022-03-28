# Console and Console Management

## Console

A terminal like console component that focuses on the user's interactions with the "terminal" and not with what commands are available. Command are defined on input to the component via a prop. Can be used standalone, and is used with `ConsoleManagement` as well (see below).


## Console Management

The `<ConsoleManager />` context component and associated `useConsoleManager()` hook allows for the management of consoles in the app by ensuring that one can show/hide/terminate consoles as well as get a list of consoles that are "running". Each console's history is maintained when a console is hidden and re-displayed when it is opened again.

