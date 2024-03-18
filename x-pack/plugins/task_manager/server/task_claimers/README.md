task_claimers
========================================================================

This directory contains code that claims the next tasks to run.

The code is structured to support multiple strategies, but currently
only supports a `default` strategy.


`default` task claiming strategy
------------------------------------------------------------------------
This has been the strategy for task manager for ... ever?  The basic 
idea:

- Run an update by query, for number of available workers, to "mark"
  task documents as claimed, by setting task state to `claiming`.  
  We can do some limited per-task logic in that update script.  

- A search is then run on the documents updated from the update by
  query.
